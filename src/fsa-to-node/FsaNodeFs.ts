import * as optHelpers from '../node/options';
import * as util from '../node/util';
import { Buffer } from '../vendor/node/internal/buffer';
import { FsPromises } from '../node/FsPromises';
import { pathToLocation } from './util';
import { ERRSTR, MODE } from '../node/constants';
import { strToEncoding } from '../encoding';
import { FsaToNodeConstants } from './constants';
import { FsaNodeDirent } from './FsaNodeDirent';
import { AMODE } from '../consts/AMODE';
import { constants } from '../constants';
import { FsaNodeStats } from './FsaNodeStats';
import queueMicrotask from '../queueMicrotask';
import { FsSynchronousApi } from '../node/types/FsSynchronousApi';
import { FsaNodeWriteStream } from './FsaNodeWriteStream';
import { FsaNodeReadStream } from './FsaNodeReadStream';
import { FsaNodeCore } from './FsaNodeCore';
import { FileHandle } from '../node/FileHandle';
import { dataToBuffer, isFd, isWin, validateFd } from '../core/util';
import * as errors from '../vendor/node/internal/errors';
import type { FsCallbackApi, FsPromisesApi } from '../node/types';
import type * as misc from '../node/types/misc';
import type * as opts from '../node/types/options';
import type * as fsa from '../fsa/types';
import type { FsCommonObjects } from '../node/types/FsCommonObjects';
import type { WritevCallback } from '../node/types/FsCallbackApi';

const notSupported: (...args: any[]) => any = () => {
  throw new Error('Method not supported by the File System Access API.');
};

const notImplemented: (...args: any[]) => any = () => {
  throw new Error('Not implemented');
};

const noop: (...args: any[]) => any = () => {};

/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
export class FsaNodeFs extends FsaNodeCore implements FsCallbackApi, FsSynchronousApi, FsCommonObjects {
  // ------------------------------------------------------------ FsPromisesApi

  public readonly promises: FsPromisesApi = new FsPromises(this, FileHandle);

  // ------------------------------------------------------------ FsCallbackApi

  public readonly open: FsCallbackApi['open'] = (
    path: misc.PathLike,
    flags: misc.TFlags,
    a?: misc.TMode | misc.TCallback<number>,
    b?: misc.TCallback<number> | string,
  ) => {
    let mode: misc.TMode = a as misc.TMode;
    let callback: misc.TCallback<number> = b as misc.TCallback<number>;
    if (typeof a === 'function') {
      mode = MODE.DEFAULT;
      callback = a;
    }
    mode = mode || MODE.DEFAULT;
    const modeNum = util.modeToNumber(mode);
    const filename = util.pathToFilename(path);
    const flagsNum = util.flagsToNumber(flags);
    this.__open(filename, flagsNum, modeNum).then(
      openFile => callback(null, openFile.fd),
      error => callback(error),
    );
  };

  public readonly close: FsCallbackApi['close'] = (fd: number, callback: misc.TCallback<void>): void => {
    validateFd(fd);
    this.__close(fd).then(
      () => callback(null),
      error => callback(error),
    );
  };

  public readonly read: FsCallbackApi['read'] = (
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
    callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void,
  ): void => {
    util.validateCallback(callback);
    // This `if` branch is from Node.js
    if (length === 0) {
      return queueMicrotask(() => {
        if (callback) callback(null, 0, buffer);
      });
    }
    (async () => {
      const openFile = await this.getFileByFd(fd, 'read');
      const file = await openFile.file.getFile();
      const src = await file.arrayBuffer();
      position = Number(position);
      length = Number(length);
      const slice =
        position > src.byteLength
          ? new Uint8Array(0)
          : new Uint8Array(src, position, Math.min(length, src.byteLength - position));
      const dest = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, slice.length);
      dest.set(slice, 0);
      return slice.length;
    })().then(
      bytesWritten => callback(null, bytesWritten, buffer),
      error => callback(error),
    );
  };

  public readonly readFile: FsCallbackApi['readFile'] = (
    id: misc.TFileId,
    a?: opts.IReadFileOptions | string | misc.TCallback<misc.TDataOut>,
    b?: misc.TCallback<misc.TDataOut>,
  ) => {
    const [opts, callback] = optHelpers.optsAndCbGenerator<opts.IReadFileOptions, misc.TDataOut>(
      optHelpers.getReadFileOptions,
    )(a, b);
    const flagsNum = util.flagsToNumber(opts.flag);
    (async () => {
      let fd: number = typeof id === 'number' ? id : -1;
      const originalFd = fd;
      try {
        if (fd === -1) {
          const filename = util.pathToFilename(id as misc.PathLike);
          fd = (await this.__open(filename, flagsNum, 0)).fd;
        }
        const handle = await this.__getFileById(fd, 'readFile');
        const file = await handle.getFile();
        const buffer = Buffer.from(await file.arrayBuffer());
        return util.bufferToEncoding(buffer, opts.encoding);
      } finally {
        try {
          const idWasFd = typeof originalFd === 'number' && originalFd >= 0;
          if (idWasFd) await this.__close(originalFd);
        } catch {}
      }
    })()
      .then(data => callback(null, data))
      .catch(error => callback(error));
  };

  public readonly write: FsCallbackApi['write'] = (
    fd: number,
    a?: unknown,
    b?: unknown,
    c?: unknown,
    d?: unknown,
    e?: unknown,
  ) => {
    const [, asStr, buf, offset, length, position, cb] = util.getWriteArgs(fd, a, b, c, d, e);
    (async () => {
      const openFile = await this.getFileByFd(fd, 'write');
      const data = buf.subarray(offset, offset + length);
      await openFile.write(data, position);
      return length;
    })().then(
      bytesWritten => cb(null, bytesWritten, asStr ? a : buf),
      error => cb(error),
    );
  };

  public readonly writev: FsCallbackApi['writev'] = (
    fd: number,
    buffers: ArrayBufferView[],
    a: number | null | WritevCallback,
    b?: WritevCallback,
  ): void => {
    validateFd(fd);
    let position: number | null = null;
    let callback: WritevCallback;
    if (typeof a === 'function') {
      callback = a;
    } else {
      position = Number(a);
      callback = <WritevCallback>b;
    }
    util.validateCallback(callback);
    (async () => {
      const openFile = await this.getFileByFd(fd, 'writev');
      const length = buffers.length;
      let bytesWritten = 0;
      for (let i = 0; i < length; i++) {
        const data = buffers[i];
        await openFile.write(data, position);
        bytesWritten += data.byteLength;
        position = null;
      }
      return bytesWritten;
    })().then(
      bytesWritten => callback(null, bytesWritten, buffers),
      error => callback(error),
    );
  };

  public readonly writeFile: FsCallbackApi['writeFile'] = (
    id: misc.TFileId,
    data: misc.TData,
    a: misc.TCallback<void> | opts.IWriteFileOptions | string,
    b?: misc.TCallback<void>,
  ): void => {
    let options: opts.IWriteFileOptions | string = a as opts.IWriteFileOptions;
    let callback: misc.TCallback<void> | undefined = b;
    if (typeof a === 'function') {
      options = optHelpers.writeFileDefaults;
      callback = a;
    }
    const cb = util.validateCallback(callback);
    const opts = optHelpers.getWriteFileOptions(options);
    const flagsNum = util.flagsToNumber(opts.flag);
    const modeNum = util.modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    (async () => {
      let fd: number = typeof id === 'number' ? id : -1;
      const originalFd = fd;
      try {
        if (fd === -1) {
          const filename = util.pathToFilename(id as misc.PathLike);
          fd = (await this.__open(filename, flagsNum, modeNum)).fd;
        }
        const file = await this.__getFileById(fd, 'writeFile');
        const writable = await file.createWritable({ keepExistingData: false });
        await writable.write(buf);
        await writable.close();
      } finally {
        try {
          const idWasFd = typeof originalFd === 'number' && originalFd >= 0;
          if (idWasFd) await this.__close(originalFd);
        } catch {}
      }
    })().then(
      () => cb(null),
      error => cb(error),
    );
  };

  public readonly copyFile: FsCallbackApi['copyFile'] = (src: misc.PathLike, dest: misc.PathLike, a, b?): void => {
    const srcFilename = util.pathToFilename(src);
    const destFilename = util.pathToFilename(dest);
    let flags: misc.TFlagsCopy;
    let callback: misc.TCallback<void>;
    if (typeof a === 'function') {
      flags = 0;
      callback = a;
    } else {
      flags = a;
      callback = b;
    }
    util.validateCallback(callback);
    const [oldFolder, oldName] = pathToLocation(srcFilename);
    const [newFolder, newName] = pathToLocation(destFilename);
    (async () => {
      const oldFile = await this.getFile(oldFolder, oldName, 'copyFile');
      const newDir = await this.getDir(newFolder, false, 'copyFile');
      const newFile = await newDir.getFileHandle(newName, { create: true });
      const writable = await newFile.createWritable({ keepExistingData: false });
      const oldData = await oldFile.getFile();
      await writable.write(await oldData.arrayBuffer());
      await writable.close();
    })().then(
      () => callback(null),
      error => callback(error),
    );
  };

  /**
   * @todo There is a proposal for native "self remove" operation.
   * @see https://github.com/whatwg/fs/blob/main/proposals/Remove.md
   */
  public readonly unlink: FsCallbackApi['unlink'] = (path: misc.PathLike, callback: misc.TCallback<void>): void => {
    const filename = util.pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    this.getDir(folder, false, 'unlink')
      .then(dir => dir.removeEntry(name))
      .then(
        () => callback(null),
        error => {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                callback(util.createError('ENOENT', 'unlink', filename));
                return;
              }
              case 'InvalidModificationError': {
                callback(util.createError('EISDIR', 'unlink', filename));
                return;
              }
            }
          }
          callback(error);
        },
      );
  };

  public readonly realpath: FsCallbackApi['realpath'] = (
    path: misc.PathLike,
    a: misc.TCallback<misc.TDataOut> | opts.IRealpathOptions | string,
    b?: misc.TCallback<misc.TDataOut>,
  ): void => {
    const [opts, callback] = optHelpers.getRealpathOptsAndCb(a, b);
    let pathFilename = util.pathToFilename(path);
    if (pathFilename[0] !== FsaToNodeConstants.Separator) pathFilename = FsaToNodeConstants.Separator + pathFilename;
    callback(null, strToEncoding(pathFilename, opts.encoding));
  };

  public readonly stat: FsCallbackApi['stat'] = (
    path: misc.PathLike,
    a: misc.TCallback<misc.IStats> | opts.IStatOptions,
    b?: misc.TCallback<misc.IStats>,
  ): void => {
    const [{ bigint = false, throwIfNoEntry = true }, callback] = optHelpers.getStatOptsAndCb(a, b);
    const filename = util.pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    (async () => {
      const handle = await this.getFileOrDir(folder, name, 'stat');
      return await this.getHandleStats(bigint, handle);
    })().then(
      stats => callback(null, stats),
      error => callback(error),
    );
  };

  public readonly lstat: FsCallbackApi['lstat'] = this.stat;

  public readonly fstat: FsCallbackApi['fstat'] = (
    fd: number,
    a: misc.TCallback<misc.IStats> | opts.IStatOptions,
    b?: misc.TCallback<misc.IStats>,
  ): void => {
    const [{ bigint = false, throwIfNoEntry = true }, callback] = optHelpers.getStatOptsAndCb(a, b);
    (async () => {
      const openFile = await this.getFileByFd(fd, 'fstat');
      return await this.getHandleStats(bigint, openFile.file);
    })().then(
      stats => callback(null, stats),
      error => callback(error),
    );
  };

  private async getHandleStats(bigint: boolean, handle: fsa.IFileSystemHandle): Promise<misc.IStats> {
    let size: number = 0;
    if (handle.kind === 'file') {
      const file = <fsa.IFileSystemFileHandle>handle;
      const fileData = await file.getFile();
      size = fileData.size;
    }
    const stats = new FsaNodeStats(bigint, bigint ? BigInt(size) : size, handle.kind);
    return stats;
  }

  /**
   * @todo There is a proposal for native move support.
   * @see https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md
   */
  public readonly rename: FsCallbackApi['rename'] = (
    oldPath: misc.PathLike,
    newPath: misc.PathLike,
    callback: misc.TCallback<void>,
  ): void => {
    const oldPathFilename = util.pathToFilename(oldPath);
    const newPathFilename = util.pathToFilename(newPath);
    const [oldFolder, oldName] = pathToLocation(oldPathFilename);
    const [newFolder, newName] = pathToLocation(newPathFilename);
    (async () => {
      const oldFile = await this.getFile(oldFolder, oldName, 'rename');
      const newDir = await this.getDir(newFolder, false, 'rename');
      const newFile = await newDir.getFileHandle(newName, { create: true });
      const writable = await newFile.createWritable({ keepExistingData: false });
      const oldData = await oldFile.getFile();
      await writable.write(await oldData.arrayBuffer());
      await writable.close();
      const oldDir = await this.getDir(oldFolder, false, 'rename');
      await oldDir.removeEntry(oldName);
    })().then(
      () => callback(null),
      error => callback(error),
    );
  };

  public readonly exists: FsCallbackApi['exists'] = (
    path: misc.PathLike,
    callback: (exists: boolean) => void,
  ): void => {
    const filename = util.pathToFilename(path);
    if (typeof callback !== 'function') throw Error(ERRSTR.CB);
    this.access(path, AMODE.F_OK, error => callback(!error));
  };

  public readonly access: FsCallbackApi['access'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | number,
    b?: misc.TCallback<void>,
  ) => {
    let mode: number = AMODE.F_OK;
    let callback: misc.TCallback<void>;
    if (typeof a !== 'function') {
      mode = a | 0; // cast to number
      callback = util.validateCallback(b);
    } else {
      callback = a;
    }
    const filename = util.pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    (async () => {
      const node = folder.length || name ? await this.getFileOrDir(folder, name, 'access') : await this.root;

      // Check execute permission - not supported by FSA
      const checkIfCanExecute = mode & AMODE.X_OK;
      if (checkIfCanExecute) throw util.createError('EACCESS', 'access', filename);

      // Use queryPermission to check read/write access
      const checkIfCanRead = mode & AMODE.R_OK;
      const checkIfCanWrite = mode & AMODE.W_OK;

      if (checkIfCanRead || checkIfCanWrite) {
        const permissionMode = checkIfCanWrite ? 'readwrite' : 'read';
        const permission = await node.queryPermission({ mode: permissionMode });

        if (permission.state === 'denied') {
          throw util.createError('EACCESS', 'access', filename);
        }
      }

      // If only F_OK is requested, we already verified the file exists by getting the node
    })().then(
      () => callback(null),
      error => callback(error),
    );
  };

  public readonly appendFile: FsCallbackApi['appendFile'] = (id: misc.TFileId, data: misc.TData, a, b?) => {
    const [opts, callback] = optHelpers.getAppendFileOptsAndCb(a, b);
    const buffer = dataToBuffer(data, opts.encoding);
    this.getFileByIdOrCreate(id, 'appendFile')
      .then(file =>
        (async () => {
          const blob = await file.getFile();
          const writable = await file.createWritable({ keepExistingData: true });
          await writable.write({
            type: 'write',
            data: buffer,
            position: blob.size,
          });
          await writable.close();
        })(),
      )
      .then(
        () => callback(null),
        error => callback(error),
      );
  };

  public readonly readdir: FsCallbackApi['readdir'] = (path: misc.PathLike, a?, b?) => {
    const [options, callback] = optHelpers.getReaddirOptsAndCb(a, b);
    const filename = util.pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    if (name) folder.push(name);
    this.getDir(folder, false, 'readdir')
      .then(dir =>
        (async () => {
          if (options.withFileTypes) {
            const list: misc.IDirent[] = [];
            for await (const [name, handle] of dir.entries()) {
              const dirent = new FsaNodeDirent(name, FsaToNodeConstants.Separator, handle.kind);
              list.push(dirent);
            }
            if (!isWin && options.encoding !== 'buffer')
              list.sort((a, b) => {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
              });
            return list;
          } else {
            const list: string[] = [];

            for await (const key of dir.keys()) list.push(key);

            if (!isWin && options.encoding !== 'buffer') list.sort();

            return list;
          }
        })(),
      )
      .then(
        res => callback(null, res),
        err => callback(err),
      );
  };

  public readonly readlink: FsCallbackApi['readlink'] = (
    path: misc.PathLike,
    a: misc.TCallback<misc.TDataOut> | opts.IOptions,
    b?: misc.TCallback<misc.TDataOut>,
  ) => {
    const [opts, callback] = optHelpers.getDefaultOptsAndCb(a, b);
    const filename = util.pathToFilename(path);
    const buffer = Buffer.from(filename);
    callback(null, util.bufferToEncoding(buffer, opts.encoding));
  };

  /** @todo Could this use `FileSystemSyncAccessHandle.flush` through a Worker thread? */
  public readonly fsync: FsCallbackApi['fsync'] = (fd: number, callback: misc.TCallback<void>): void => {
    callback(null);
  };

  public readonly fdatasync: FsCallbackApi['fdatasync'] = (fd: number, callback: misc.TCallback<void>): void => {
    callback(null);
  };

  public readonly ftruncate: FsCallbackApi['ftruncate'] = (
    fd: number,
    a: misc.TCallback<void> | number,
    b?: misc.TCallback<void>,
  ): void => {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: misc.TCallback<void> = util.validateCallback(typeof a === 'number' ? b : a);
    this.getFileByFdAsync(fd)
      .then(file => file.file.createWritable({ keepExistingData: true }))
      .then(writable => writable.truncate(len).then(() => writable.close()))
      .then(
        () => callback(null),
        error => callback(error),
      );
  };

  public readonly truncate: FsCallbackApi['truncate'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | number,
    b?: misc.TCallback<void>,
  ) => {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: misc.TCallback<void> = util.validateCallback(typeof a === 'number' ? b : a);
    this.open(path, 'r+', (error, fd) => {
      if (error) callback(error);
      else {
        this.ftruncate(fd!, len, error => {
          if (error) this.close(fd!, () => callback(error));
          else this.close(fd!, callback);
        });
      }
    });
  };

  public readonly futimes: FsCallbackApi['futimes'] = (
    fd: number,
    atime: misc.TTime,
    mtime: misc.TTime,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly utimes: FsCallbackApi['utimes'] = (
    path: misc.PathLike,
    atime: misc.TTime,
    mtime: misc.TTime,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly mkdir: FsCallbackApi['mkdir'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | misc.TMode | opts.IMkdirOptions,
    b?: misc.TCallback<string> | misc.TCallback<void>,
  ) => {
    const opts: misc.TMode | opts.IMkdirOptions = optHelpers.getMkdirOptions(a);
    const callback = util.validateCallback(typeof a === 'function' ? a : b!);
    // const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = util.pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    // TODO: need to throw if directory already exists
    this.getDir(folder, opts.recursive ?? false)
      .then(dir => dir.getDirectoryHandle(name, { create: true }))
      .then(
        () => callback(null),
        error => {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                const err = util.createError('ENOENT', 'mkdir', folder.join(FsaToNodeConstants.Separator));
                callback(err);
                return;
              }
            }
          }
          callback(error);
        },
      );
  };

  public readonly mkdtemp: FsCallbackApi['mkdtemp'] = (
    prefix: string,
    a: misc.TCallback<string> | opts.IOptions,
    b?: misc.TCallback<string>,
  ) => {
    const [{ encoding }, callback] = optHelpers.getDefaultOptsAndCb(a, b);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    if (!util.nullCheck(prefix)) return;
    const filename = prefix + util.genRndStr6();
    this.mkdir(filename, MODE.DIR, err => {
      if (err) callback(err);
      else callback(null, strToEncoding(filename, encoding));
    });
  };

  private rmAll(callback: (err: Error | null) => void): void {
    (async () => {
      const root = await this.root;
      for await (const name of root.keys()) {
        await root.removeEntry(name, { recursive: true });
      }
    })().then(
      () => callback(null),
      error => callback(error),
    );
  }

  public readonly rmdir: FsCallbackApi['rmdir'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | opts.IRmdirOptions,
    b?: misc.TCallback<void>,
  ) => {
    const options: opts.IRmdirOptions = optHelpers.getRmdirOptions(a);
    const callback: misc.TCallback<void> = util.validateCallback(typeof a === 'function' ? a : b);
    const [folder, name] = pathToLocation(util.pathToFilename(path));
    if (!name && options.recursive) return this.rmAll(callback);
    this.getDir(folder, false, 'rmdir')
      .then(dir => dir.getDirectoryHandle(name).then(() => dir))
      .then(dir => dir.removeEntry(name, { recursive: options.recursive ?? false }))
      .then(
        () => callback(null),
        error => {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                const err = util.createError('ENOENT', 'rmdir', folder.join(FsaToNodeConstants.Separator));
                callback(err);
                return;
              }
              case 'InvalidModificationError': {
                const err = util.createError('ENOTEMPTY', 'rmdir', folder.join(FsaToNodeConstants.Separator));
                callback(err);
                return;
              }
            }
          }
          callback(error);
        },
      );
  };

  public readonly rm: FsCallbackApi['rm'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | opts.IRmOptions,
    b?: misc.TCallback<void>,
  ): void => {
    const [options, callback] = optHelpers.getRmOptsAndCb(a, b);
    const [folder, name] = pathToLocation(util.pathToFilename(path));
    if (!name && options.recursive) return this.rmAll(callback);
    this.getDir(folder, false, 'rmdir')
      .then(dir => dir.removeEntry(name, { recursive: options.recursive ?? false }))
      .then(
        () => callback(null),
        error => {
          if (options.force) {
            callback(null);
            return;
          }
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                const err = util.createError('ENOENT', 'rmdir', folder.join(FsaToNodeConstants.Separator));
                callback(err);
                return;
              }
              case 'InvalidModificationError': {
                const err = util.createError('ENOTEMPTY', 'rmdir', folder.join(FsaToNodeConstants.Separator));
                callback(err);
                return;
              }
            }
          }
          callback(error);
        },
      );
  };

  public readonly fchmod: FsCallbackApi['fchmod'] = (
    fd: number,
    mode: misc.TMode,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly chmod: FsCallbackApi['chmod'] = (
    path: misc.PathLike,
    mode: misc.TMode,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly lchmod: FsCallbackApi['lchmod'] = (
    path: misc.PathLike,
    mode: misc.TMode,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly fchown: FsCallbackApi['fchown'] = (
    fd: number,
    uid: number,
    gid: number,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly chown: FsCallbackApi['chown'] = (
    path: misc.PathLike,
    uid: number,
    gid: number,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly lchown: FsCallbackApi['lchown'] = (
    path: misc.PathLike,
    uid: number,
    gid: number,
    callback: misc.TCallback<void>,
  ): void => {
    callback(null);
  };

  public readonly createWriteStream: FsCallbackApi['createWriteStream'] = (
    path: misc.PathLike,
    options?: opts.IWriteStreamOptions | string,
  ): FsaNodeWriteStream => {
    const defaults: opts.IWriteStreamOptions = {
      encoding: 'utf8',
      flags: 'w',
      autoClose: true,
      emitClose: true,
    };
    const optionsObj: opts.IWriteStreamOptions = optHelpers.getOptions(defaults, options);
    const filename = util.pathToFilename(path);
    const flags = util.flagsToNumber(optionsObj.flags ?? 'w');
    const fd: number = optionsObj.fd ? (typeof optionsObj.fd === 'number' ? optionsObj.fd : optionsObj.fd.fd) : 0;
    const handle = fd ? this.getFileByFdAsync(fd) : this.__open(filename, flags, 0);
    const stream = new FsaNodeWriteStream(handle, filename, optionsObj);
    if (optionsObj.autoClose) {
      stream.once('finish', () => {
        handle.then(file => this.close(file.fd, () => {}));
      });
      stream.once('error', () => {
        handle.then(file => this.close(file.fd, () => {}));
      });
    }
    return stream;
  };

  public readonly createReadStream: FsCallbackApi['createReadStream'] = (
    path: misc.PathLike,
    options?: opts.IReadStreamOptions | string,
  ): misc.IReadStream => {
    const defaults: opts.IReadStreamOptions = {
      flags: 'r',
      fd: null,
      mode: 0o666,
      autoClose: true,
      emitClose: true,
      start: 0,
      end: Infinity,
      highWaterMark: 64 * 1024,
      fs: null,
      signal: null,
    };
    const optionsObj: opts.IReadStreamOptions = optHelpers.getOptions<opts.IReadStreamOptions>(defaults, options);
    const filename = util.pathToFilename(path);
    const flags = util.flagsToNumber(optionsObj.flags);
    const fd: number = optionsObj.fd ? (typeof optionsObj.fd === 'number' ? optionsObj.fd : optionsObj.fd.fd) : 0;
    const handle = fd ? this.getFileByFdAsync(fd) : this.__open(filename, flags, 0);
    const stream = new FsaNodeReadStream(this, handle, filename, optionsObj);
    return stream;
  };

  public openAsBlob = async (path: misc.PathLike, options?: opts.IOpenAsBlobOptions): Promise<Blob> => {
    let buffer;
    try {
      buffer = await new Promise<Buffer>((resolve, reject) => {
        this.readFile(path, (err, data: Buffer) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    } catch (error) {
      // Convert ENOENT to Node.js-compatible error for openAsBlob
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        const nodeError = new errors.TypeError('ERR_INVALID_ARG_VALUE');
        throw nodeError;
      }
      throw error;
    }
    const type = options?.type || '';
    return new Blob([buffer as BlobPart], { type });
  };

  public readonly cp: FsCallbackApi['cp'] = notImplemented;
  public readonly lutimes: FsCallbackApi['lutimes'] = notImplemented;
  public readonly opendir: FsCallbackApi['opendir'] = notImplemented;
  public readonly readv: FsCallbackApi['readv'] = notImplemented;
  public readonly statfs: FsCallbackApi['statfs'] = notImplemented;
  public readonly glob: FsCallbackApi['glob'] = notImplemented;

  /**
   * @todo Implement using `FileSystemObserver` class.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
   */
  public readonly watchFile: FsCallbackApi['watchFile'] = notSupported;
  public readonly unwatchFile: FsCallbackApi['unwatchFile'] = notSupported;
  public readonly watch: FsCallbackApi['watch'] = notSupported;

  public readonly symlink: FsCallbackApi['symlink'] = notSupported;
  public readonly link: FsCallbackApi['link'] = notSupported;

  // --------------------------------------------------------- FsSynchronousApi

  public readonly statSync: FsSynchronousApi['statSync'] = (
    path: misc.PathLike,
    options?: opts.IStatOptions,
  ): misc.IStats<any> => {
    const { bigint = true, throwIfNoEntry = true } = optHelpers.getStatOptions(options);
    const filename = util.pathToFilename(path);
    const location = pathToLocation(filename);
    const adapter = this.getSyncAdapter();
    const res = adapter.call('stat', location);
    const stats = new FsaNodeStats(bigint, res.size ?? 0, res.kind);
    return stats;
  };

  public readonly lstatSync: FsSynchronousApi['lstatSync'] = this.statSync;

  public readonly fstatSync: FsSynchronousApi['fstatSync'] = (fd: number, options?: opts.IFStatOptions) => {
    const filename = this.getFileName(fd);
    return this.statSync(filename, options as any) as any;
  };

  public readonly accessSync: FsSynchronousApi['accessSync'] = (
    path: misc.PathLike,
    mode: number = AMODE.F_OK,
  ): void => {
    const filename = util.pathToFilename(path);
    mode = mode | 0;
    const adapter = this.getSyncAdapter();
    adapter.call('access', [filename, mode]);
  };

  public readonly readFileSync: FsSynchronousApi['readFileSync'] = (
    id: misc.TFileId,
    options?: opts.IReadFileOptions | string,
  ): misc.TDataOut => {
    const opts = optHelpers.getReadFileOptions(options);
    const flagsNum = util.flagsToNumber(opts.flag);
    const filename = this.getFileName(id);
    const adapter = this.getSyncAdapter();
    const uint8 = adapter.call('readFile', [filename, opts]);
    const buffer = Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    return util.bufferToEncoding(buffer, opts.encoding);
  };

  public readonly writeFileSync: FsSynchronousApi['writeFileSync'] = (
    id: misc.TFileId,
    data: misc.TData,
    options?: opts.IWriteFileOptions,
  ): void => {
    const opts = optHelpers.getWriteFileOptions(options);
    const flagsNum = util.flagsToNumber(opts.flag);
    const modeNum = util.modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    const filename = this.getFileName(id);
    const adapter = this.getSyncAdapter();
    adapter.call('writeFile', [filename, util.bufToUint8(buf), opts]);
  };

  public readonly appendFileSync: FsSynchronousApi['appendFileSync'] = (
    id: misc.TFileId,
    data: misc.TData,
    options?: opts.IAppendFileOptions | string,
  ) => {
    const opts = optHelpers.getAppendFileOpts(options);
    if (!opts.flag || isFd(id)) opts.flag = 'a';
    const filename = this.getFileName(id);
    const buf = dataToBuffer(data, opts.encoding);
    const adapter = this.getSyncAdapter();
    adapter.call('appendFile', [filename, util.bufToUint8(buf), opts]);
  };

  public readonly closeSync: FsSynchronousApi['closeSync'] = (fd: number) => {
    validateFd(fd);
    const file = this.getFileByFd(fd, 'close');
    file.close().catch(() => {});
    this.fds.delete(fd);
    this.releasedFds.push(fd);
  };

  public readonly existsSync: FsSynchronousApi['existsSync'] = (path: misc.PathLike): boolean => {
    try {
      this.statSync(path);
      return true;
    } catch {
      return false;
    }
  };

  public readonly copyFileSync: FsSynchronousApi['copyFileSync'] = (
    src: misc.PathLike,
    dest: misc.PathLike,
    flags?: misc.TFlagsCopy,
  ): void => {
    const srcFilename = util.pathToFilename(src);
    const destFilename = util.pathToFilename(dest);
    const adapter = this.getSyncAdapter();
    adapter.call('copy', [srcFilename, destFilename, flags]);
  };

  public readonly renameSync: FsSynchronousApi['renameSync'] = (
    oldPath: misc.PathLike,
    newPath: misc.PathLike,
  ): void => {
    const srcFilename = util.pathToFilename(oldPath);
    const destFilename = util.pathToFilename(newPath);
    const adapter = this.getSyncAdapter();
    adapter.call('move', [srcFilename, destFilename]);
  };

  public readonly rmdirSync: FsSynchronousApi['rmdirSync'] = (path: misc.PathLike, opts?: opts.IRmdirOptions): void => {
    const filename = util.pathToFilename(path);
    const adapter = this.getSyncAdapter();
    adapter.call('rmdir', [filename, opts]);
  };

  public readonly rmSync: FsSynchronousApi['rmSync'] = (path: misc.PathLike, options?: opts.IRmOptions): void => {
    const filename = util.pathToFilename(path);
    const adapter = this.getSyncAdapter();
    adapter.call('rm', [filename, options]);
  };

  public readonly mkdirSync: FsSynchronousApi['mkdirSync'] = (
    path: misc.PathLike,
    options?: misc.TMode | opts.IMkdirOptions,
  ): string | undefined => {
    const opts = optHelpers.getMkdirOptions(options);
    const modeNum = util.modeToNumber(opts.mode, 0o777);
    const filename = util.pathToFilename(path);
    return this.getSyncAdapter().call('mkdir', [filename, options]);
  };

  public readonly mkdtempSync: FsSynchronousApi['mkdtempSync'] = (
    prefix: string,
    options?: opts.IOptions,
  ): misc.TDataOut => {
    const { encoding } = optHelpers.getDefaultOpts(options);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    util.nullCheck(prefix);
    const result = this.getSyncAdapter().call('mkdtemp', [prefix, options]);
    return strToEncoding(result, encoding);
  };

  public readonly readlinkSync: FsSynchronousApi['readlinkSync'] = (
    path: misc.PathLike,
    options?: opts.IOptions,
  ): misc.TDataOut => {
    const opts = optHelpers.getDefaultOpts(options);
    const filename = util.pathToFilename(path);
    const buffer = Buffer.from(filename);
    return util.bufferToEncoding(buffer, opts.encoding);
  };

  public readonly truncateSync: FsSynchronousApi['truncateSync'] = (id: misc.TFileId, len?: number): void => {
    if (isFd(id)) return this.ftruncateSync(id as number, len);
    const filename = util.pathToFilename(id as misc.PathLike);
    this.getSyncAdapter().call('trunc', [filename, Number(len) || 0]);
  };

  public readonly ftruncateSync: FsSynchronousApi['ftruncateSync'] = (fd: number, len?: number): void => {
    const filename = this.getFileName(fd);
    this.truncateSync(filename, len);
  };

  public readonly unlinkSync: FsSynchronousApi['unlinkSync'] = (path: misc.PathLike): void => {
    const filename = util.pathToFilename(path);
    this.getSyncAdapter().call('unlink', [filename]);
  };

  public readonly readdirSync: FsSynchronousApi['readdirSync'] = (
    path: misc.PathLike,
    options?: opts.IReaddirOptions | string,
  ): misc.TDataOut[] | misc.IDirent[] => {
    const opts = optHelpers.getReaddirOptions(options);
    const filename = util.pathToFilename(path);
    const [folder] = pathToLocation(filename);
    const adapter = this.getSyncAdapter();
    const list = adapter.call('readdir', [filename]);
    if (opts.withFileTypes) {
      const res: misc.IDirent[] = [];
      for (const entry of list) res.push(new FsaNodeDirent(entry.name, folder.join(FsaToNodeConstants.Separator), entry.kind));
      return res;
    } else {
      const res: misc.TDataOut[] = [];
      for (const entry of list) {
        const buffer = Buffer.from(entry.name);
        res.push(util.bufferToEncoding(buffer, opts.encoding));
      }
      return res;
    }
  };

  public readonly realpathSync: FsSynchronousApi['realpathSync'] = (
    path: misc.PathLike,
    options?: opts.IRealpathOptions | string,
  ): misc.TDataOut => {
    let filename = util.pathToFilename(path);
    const { encoding } = optHelpers.getRealpathOptions(options);
    if (filename[0] !== FsaToNodeConstants.Separator) filename = FsaToNodeConstants.Separator + filename;
    return strToEncoding(filename, encoding);
  };

  public readonly readSync: FsSynchronousApi['readSync'] = (
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
  ): number => {
    validateFd(fd);
    const filename = this.getFileName(fd);
    const adapter = this.getSyncAdapter();
    const uint8 = adapter.call('read', [filename, position, length]);
    const dest = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    dest.set(uint8, offset);
    return uint8.length;
  };

  public readonly writeSync: FsSynchronousApi['writeSync'] = (
    fd: number,
    a: string | Buffer | ArrayBufferView | DataView,
    b?: number,
    c?: number | BufferEncoding,
    d?: number | null,
  ): number => {
    const [, buf, offset, length, position] = util.getWriteSyncArgs(fd, a, b, c, d);
    const filename = this.getFileName(fd);
    const data = new Uint8Array(buf.buffer, buf.byteOffset + offset, length);
    return this.getSyncAdapter().call('write', [filename, data, position || null]);
  };

  public readonly openSync: FsSynchronousApi['openSync'] = (
    path: misc.PathLike,
    flags: misc.TFlags,
    mode: misc.TMode = MODE.DEFAULT,
  ): number => {
    const modeNum = util.modeToNumber(mode);
    const filename = util.pathToFilename(path);
    const flagsNum = util.flagsToNumber(flags);
    const adapter = this.getSyncAdapter();
    const handle = adapter.call('open', [filename, flagsNum, modeNum]);
    const openFile = this.__open2(handle, filename, flagsNum, modeNum);
    return openFile.fd;
  };

  public readonly writevSync: FsSynchronousApi['writevSync'] = (
    fd: number,
    buffers: ArrayBufferView[],
    position?: number | null,
  ): number => {
    if (buffers.length === 0) return 0;
    let bytesWritten = 0;
    bytesWritten += this.writeSync(fd, buffers[0], 0, buffers[0].byteLength, position);
    for (let i = 1; i < buffers.length; i++) {
      bytesWritten += this.writeSync(fd, buffers[i], 0, buffers[i].byteLength, null);
    }
    return bytesWritten;
  };

  public readonly fdatasyncSync: FsSynchronousApi['fdatasyncSync'] = noop;
  public readonly fsyncSync: FsSynchronousApi['fsyncSync'] = noop;
  public readonly chmodSync: FsSynchronousApi['chmodSync'] = noop;
  public readonly chownSync: FsSynchronousApi['chownSync'] = noop;
  public readonly fchmodSync: FsSynchronousApi['fchmodSync'] = noop;
  public readonly fchownSync: FsSynchronousApi['fchownSync'] = noop;
  public readonly futimesSync: FsSynchronousApi['futimesSync'] = noop;
  public readonly lchmodSync: FsSynchronousApi['lchmodSync'] = noop;
  public readonly lchownSync: FsSynchronousApi['lchownSync'] = noop;
  public readonly utimesSync: FsSynchronousApi['utimesSync'] = noop;
  public readonly lutimesSync: FsSynchronousApi['lutimesSync'] = noop;

  public readonly cpSync: FsSynchronousApi['cpSync'] = notImplemented;
  public readonly opendirSync: FsSynchronousApi['opendirSync'] = notImplemented;
  public readonly statfsSync: FsSynchronousApi['statfsSync'] = notImplemented;
  public readonly readvSync: FsSynchronousApi['readvSync'] = notImplemented;
  public readonly globSync: FsSynchronousApi['globSync'] = notImplemented;

  public readonly symlinkSync: FsSynchronousApi['symlinkSync'] = notSupported;
  public readonly linkSync: FsSynchronousApi['linkSync'] = notSupported;

  // ---------------------------------------------------------- FsCommonObjects

  public readonly F_OK = constants.F_OK;
  public readonly R_OK = constants.R_OK;
  public readonly W_OK = constants.W_OK;
  public readonly X_OK = constants.X_OK;
  public readonly constants = constants;
  public readonly Dirent = FsaNodeDirent;
  public readonly Stats = FsaNodeStats<any>;
  public readonly WriteStream = FsaNodeWriteStream;
  public readonly ReadStream = FsaNodeReadStream;

  public readonly StatFs = 0 as any;
  public readonly Dir = 0 as any;
  public readonly StatsWatcher = 0 as any;
  public readonly FSWatcher = 0 as any;
}
