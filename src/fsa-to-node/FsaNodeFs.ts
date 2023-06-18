import { createPromisesApi } from '../node/promises';
import {
  getDefaultOptsAndCb,
  getMkdirOptions,
  getReadFileOptions,
  getReaddirOptsAndCb,
  getRmOptsAndCb,
  getRmdirOptions,
  optsAndCbGenerator,
  getAppendFileOptsAndCb,
  getStatOptsAndCb,
  getRealpathOptsAndCb,
  writeFileDefaults,
  getWriteFileOptions,
  getOptions,
  getStatOptions,
  getAppendFileOpts,
  getDefaultOpts,
} from '../node/options';
import {
  bufToUint8,
  bufferToEncoding,
  createError,
  dataToBuffer,
  flagsToNumber,
  genRndStr6,
  getWriteArgs,
  isWin,
  modeToNumber,
  nullCheck,
  pathToFilename,
  validateCallback,
  validateFd,
  isFd,
} from '../node/util';
import { pathToLocation, testDirectoryIsWritable } from './util';
import { ERRSTR, MODE } from '../node/constants';
import { strToEncoding } from '../encoding';
import { FsaToNodeConstants } from './constants';
import { FsaNodeDirent } from './FsaNodeDirent';
import { FLAG } from '../consts/FLAG';
import { AMODE } from '../consts/AMODE';
import { constants } from '../constants';
import { FsaNodeStats } from './FsaNodeStats';
import process from '../process';
import { FsSynchronousApi } from '../node/types/FsSynchronousApi';
import { FsaNodeWriteStream } from './FsaNodeWriteStream';
import { FsaNodeCore } from './FsaNodeCore';
import type { FsCallbackApi, FsPromisesApi } from '../node/types';
import type * as misc from '../node/types/misc';
import type * as opts from '../node/types/options';
import type * as fsa from '../fsa/types';
import type { FsCommonObjects } from '../node/types/FsCommonObjects';
import type { WritevCallback } from '../node/types/callback';

const notSupported: (...args: any[]) => any = () => {
  throw new Error('Method not supported by the File System Access API.');
};

const noop: (...args: any[]) => any = () => {};

/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
export class FsaNodeFs extends FsaNodeCore implements FsCallbackApi, FsSynchronousApi, FsCommonObjects {
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
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    const flagsNum = flagsToNumber(flags);
    this.__open(filename, flagsNum, modeNum).then(
      openFile => callback(null, openFile.fd),
      error => callback(error),
    );
  };

  public readonly close: FsCallbackApi['close'] = (fd: number, callback: misc.TCallback<void>): void => {
    validateFd(fd);
    this.getFileByFdAsync(fd, 'close')
      .then(file => file.close())
      .then(
        () => {
          this.fds.delete(fd);
          this.releasedFds.push(fd);
          callback(null);
        },
        error => {
          callback(error);
        },
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
    validateCallback(callback);
    // This `if` branch is from Node.js
    if (length === 0) {
      return process.nextTick(() => {
        if (callback) callback(null, 0, buffer);
      });
    }
    (async () => {
      const openFile = await this.getFileByFd(fd, 'read');
      const file = await openFile.file.getFile();
      const src = await file.arrayBuffer();
      const slice = new Uint8Array(src, Number(position), Number(length));
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
    const [opts, callback] = optsAndCbGenerator<opts.IReadFileOptions, misc.TDataOut>(getReadFileOptions)(a, b);
    const flagsNum = flagsToNumber(opts.flag);
    return this.getFileById(id, 'readFile')
      .then(file => file.getFile())
      .then(file => file.arrayBuffer())
      .then(data => {
        const buffer = Buffer.from(data);
        callback(null, bufferToEncoding(buffer, opts.encoding));
      })
      .catch(error => {
        callback(error);
      });
  };

  public readonly write: FsCallbackApi['write'] = (
    fd: number,
    a?: unknown,
    b?: unknown,
    c?: unknown,
    d?: unknown,
    e?: unknown,
  ) => {
    const [, asStr, buf, offset, length, position, cb] = getWriteArgs(fd, a, b, c, d, e);
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
    validateCallback(callback);
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
      options = writeFileDefaults;
      callback = a;
    }
    const cb = validateCallback(callback);
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    (async () => {
      const createIfMissing = !!(flagsNum & FLAG.O_CREAT);
      const file = await this.getFileById(id, 'writeFile', createIfMissing);
      const writable = await file.createWritable({ keepExistingData: false });
      await writable.write(buf);
      await writable.close();
    })().then(
      () => cb(null),
      error => cb(error),
    );
  };

  public readonly copyFile: FsCallbackApi['copyFile'] = (src: misc.PathLike, dest: misc.PathLike, a, b?): void => {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);
    let flags: misc.TFlagsCopy;
    let callback: misc.TCallback<void>;
    if (typeof a === 'function') {
      flags = 0;
      callback = a;
    } else {
      flags = a;
      callback = b;
    }
    validateCallback(callback);
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

  public readonly unlink: FsCallbackApi['unlink'] = (path: misc.PathLike, callback: misc.TCallback<void>): void => {
    const filename = pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    this.getDir(folder, false, 'unlink')
      .then(dir => dir.removeEntry(name))
      .then(
        () => callback(null),
        error => {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                callback(createError('ENOENT', 'unlink', filename));
                return;
              }
              case 'InvalidModificationError': {
                callback(createError('EISDIR', 'unlink', filename));
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
    const [opts, callback] = getRealpathOptsAndCb(a, b);
    let pathFilename = pathToFilename(path);
    if (pathFilename[0] !== FsaToNodeConstants.Separator) pathFilename = FsaToNodeConstants.Separator + pathFilename;
    callback(null, strToEncoding(pathFilename, opts.encoding));
  };

  public readonly stat: FsCallbackApi['stat'] = (
    path: misc.PathLike,
    a: misc.TCallback<misc.IStats> | opts.IStatOptions,
    b?: misc.TCallback<misc.IStats>,
  ): void => {
    const [{ bigint = false, throwIfNoEntry = true }, callback] = getStatOptsAndCb(a, b);
    const filename = pathToFilename(path);
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
    const [{ bigint = false, throwIfNoEntry = true }, callback] = getStatOptsAndCb(a, b);
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

  public readonly rename: FsCallbackApi['rename'] = (
    oldPath: misc.PathLike,
    newPath: misc.PathLike,
    callback: misc.TCallback<void>,
  ): void => {
    const oldPathFilename = pathToFilename(oldPath);
    const newPathFilename = pathToFilename(newPath);
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
    const filename = pathToFilename(path);
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
      callback = validateCallback(b);
    } else {
      callback = a;
    }
    const filename = pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    (async () => {
      const node = folder.length || name ? await this.getFileOrDir(folder, name, 'access') : this.root;
      const checkIfCanExecute = mode & AMODE.X_OK;
      if (checkIfCanExecute) throw createError('EACCESS', 'access', filename);
      const checkIfCanWrite = mode & AMODE.W_OK;
      switch (node.kind) {
        case 'file': {
          if (checkIfCanWrite) {
            try {
              const file = node as fsa.IFileSystemFileHandle;
              const writable = await file.createWritable();
              await writable.close();
            } catch {
              throw createError('EACCESS', 'access', filename);
            }
          }
          break;
        }
        case 'directory': {
          if (checkIfCanWrite) {
            const dir = node as fsa.IFileSystemDirectoryHandle;
            const canWrite = await testDirectoryIsWritable(dir);
            if (!canWrite) throw createError('EACCESS', 'access', filename);
          }
          break;
        }
        default: {
          throw createError('EACCESS', 'access', filename);
        }
      }
    })().then(
      () => callback(null),
      error => callback(error),
    );
  };

  public readonly appendFile: FsCallbackApi['appendFile'] = (id: misc.TFileId, data: misc.TData, a, b?) => {
    const [opts, callback] = getAppendFileOptsAndCb(a, b);
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
    const [options, callback] = getReaddirOptsAndCb(a, b);
    const filename = pathToFilename(path);
    const [folder, name] = pathToLocation(filename);
    if (name) folder.push(name);
    this.getDir(folder, false, 'readdir')
      .then(dir =>
        (async () => {
          if (options.withFileTypes) {
            const list: misc.IDirent[] = [];
            for await (const [name, handle] of dir.entries()) {
              const dirent = new FsaNodeDirent(name, handle);
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
    const [opts, callback] = getDefaultOptsAndCb(a, b);
    const filename = pathToFilename(path);
    const buffer = Buffer.from(filename);
    callback(null, bufferToEncoding(buffer, opts.encoding));
  };

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
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'number' ? b : a);
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
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'number' ? b : a);
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
    const opts: misc.TMode | opts.IMkdirOptions = getMkdirOptions(a);
    const callback = validateCallback(typeof a === 'function' ? a : b!);
    // const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
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
                const err = createError('ENOENT', 'mkdir', folder.join('/'));
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
    const [{ encoding }, callback] = getDefaultOptsAndCb(a, b);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    if (!nullCheck(prefix)) return;
    const filename = prefix + genRndStr6();
    this.mkdir(filename, MODE.DIR, err => {
      if (err) callback(err);
      else callback(null, strToEncoding(filename, encoding));
    });
  };

  public readonly rmdir: FsCallbackApi['rmdir'] = (
    path: misc.PathLike,
    a: misc.TCallback<void> | opts.IRmdirOptions,
    b?: misc.TCallback<void>,
  ) => {
    const options: opts.IRmdirOptions = getRmdirOptions(a);
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'function' ? a : b);
    const [folder, name] = pathToLocation(pathToFilename(path));
    this.getDir(folder, false, 'rmdir')
      .then(dir => dir.getDirectoryHandle(name).then(() => dir))
      .then(dir => dir.removeEntry(name, { recursive: options.recursive ?? false }))
      .then(
        () => callback(null),
        error => {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'NotFoundError': {
                const err = createError('ENOENT', 'rmdir', folder.join('/'));
                callback(err);
                return;
              }
              case 'InvalidModificationError': {
                const err = createError('ENOTEMPTY', 'rmdir', folder.join('/'));
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
    const [options, callback] = getRmOptsAndCb(a, b);
    const [folder, name] = pathToLocation(pathToFilename(path));
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
                const err = createError('ENOENT', 'rmdir', folder.join('/'));
                callback(err);
                return;
              }
              case 'InvalidModificationError': {
                const err = createError('ENOTEMPTY', 'rmdir', folder.join('/'));
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
    const optionsObj: opts.IWriteStreamOptions = getOptions(defaults, options);
    const filename = pathToFilename(path);
    const flags = flagsToNumber(optionsObj.flags ?? 'w');
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

  public readonly symlink: FsCallbackApi['symlink'] = notSupported;
  public readonly link: FsCallbackApi['link'] = notSupported;
  public readonly watchFile: FsCallbackApi['watchFile'] = notSupported;
  public readonly unwatchFile: FsCallbackApi['unwatchFile'] = notSupported;
  public readonly createReadStream: FsCallbackApi['createReadStream'] = notSupported;
  public readonly watch: FsCallbackApi['watch'] = notSupported;

  // --------------------------------------------------------- FsSynchronousApi

  public readonly statSync: FsSynchronousApi['statSync'] = (
    path: misc.PathLike,
    options?: opts.IStatOptions,
  ): misc.IStats<any> => {
    const { bigint = true, throwIfNoEntry = true } = getStatOptions(options);
    const filename = pathToFilename(path);
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
    const filename = pathToFilename(path);
    mode = mode | 0;
    const adapter = this.getSyncAdapter();
    adapter.call('access', { filename, mode });
  };

  public readonly readFileSync: FsSynchronousApi['readFileSync'] = (
    id: misc.TFileId,
    options?: opts.IReadFileOptions | string,
  ): misc.TDataOut => {
    const opts = getReadFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const filename = this.getFileName(id);
    const adapter = this.getSyncAdapter();
    const uint8 = adapter.call('readFile', { filename, opts });
    const buffer = Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    return bufferToEncoding(buffer, opts.encoding);
  };

  public readonly writeFileSync: FsSynchronousApi['writeFileSync'] = (
    id: misc.TFileId,
    data: misc.TData,
    options?: opts.IWriteFileOptions,
  ): void => {
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    const filename = this.getFileName(id);
    const adapter = this.getSyncAdapter();
    adapter.call('writeFile', { filename, data: bufToUint8(buf), opts });
  };

  public readonly appendFileSync: FsSynchronousApi['appendFileSync'] = (id: misc.TFileId, data: misc.TData, options?: opts.IAppendFileOptions | string) => {
    const opts = getAppendFileOpts(options);
    if (!opts.flag || isFd(id)) opts.flag = 'a';
    const filename = this.getFileName(id);
    const buf = dataToBuffer(data, opts.encoding);
    const adapter = this.getSyncAdapter();
    adapter.call('appendFile', { filename, data: bufToUint8(buf), opts });
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

  public readonly copyFileSync: FsSynchronousApi['copyFileSync'] = (src: misc.PathLike, dest: misc.PathLike, flags?: misc.TFlagsCopy): void => {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);
    const adapter = this.getSyncAdapter();
    adapter.call('copy', {src: srcFilename, dst: destFilename, flags});
  };

  public readonly renameSync: FsSynchronousApi['renameSync'] = (oldPath: misc.PathLike, newPath: misc.PathLike): void => {
    const srcFilename = pathToFilename(oldPath);
    const destFilename = pathToFilename(newPath);
    const adapter = this.getSyncAdapter();
    adapter.call('move', {src: srcFilename, dst: destFilename});
  };

  public readonly rmdirSync: FsSynchronousApi['rmdirSync'] = (path: misc.PathLike, opts?: opts.IRmdirOptions): void => {
    const filename = pathToFilename(path);
    const adapter = this.getSyncAdapter();
    adapter.call('rmdir', [filename, opts]);
  };

  public readonly rmSync: FsSynchronousApi['rmSync'] = (path: misc.PathLike, options?: opts.IRmOptions): void => {
    const filename = pathToFilename(path);
    const adapter = this.getSyncAdapter();
    adapter.call('rm', [filename, options]);
  };

  public readonly mkdirSync: FsSynchronousApi['mkdirSync'] = (path: misc.PathLike, options?: misc.TMode | opts.IMkdirOptions): string | undefined => {
    const opts = getMkdirOptions(options);
    const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
    return this.getSyncAdapter().call('mkdir', [filename, options]);
  };

  public readonly mkdtempSync: FsSynchronousApi['mkdtempSync'] = (prefix: string, options?: opts.IOptions): misc.TDataOut => {
    const {encoding} = getDefaultOpts(options);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    nullCheck(prefix);
    const result = this.getSyncAdapter().call('mkdtemp', [prefix, options]);
    return strToEncoding(result, encoding);
  };

  public readonly ftruncateSync: FsSynchronousApi['ftruncateSync'] = notSupported;
  public readonly linkSync: FsSynchronousApi['linkSync'] = notSupported;
  public readonly openSync: FsSynchronousApi['openSync'] = notSupported;
  public readonly readdirSync: FsSynchronousApi['readdirSync'] = notSupported;
  public readonly readlinkSync: FsSynchronousApi['readlinkSync'] = notSupported;
  public readonly readSync: FsSynchronousApi['readSync'] = notSupported;
  public readonly realpathSync: FsSynchronousApi['realpathSync'] = notSupported;
  public readonly symlinkSync: FsSynchronousApi['symlinkSync'] = notSupported;
  public readonly truncateSync: FsSynchronousApi['truncateSync'] = notSupported;
  public readonly unlinkSync: FsSynchronousApi['unlinkSync'] = notSupported;
  public readonly writeSync: FsSynchronousApi['writeSync'] = notSupported;
  public readonly chmodSync: FsSynchronousApi['chmodSync'] = noop;
  public readonly chownSync: FsSynchronousApi['chownSync'] = noop;
  public readonly fchmodSync: FsSynchronousApi['fchmodSync'] = noop;
  public readonly fchownSync: FsSynchronousApi['fchownSync'] = noop;
  public readonly fdatasyncSync: FsSynchronousApi['fdatasyncSync'] = noop;
  public readonly fsyncSync: FsSynchronousApi['fsyncSync'] = noop;
  public readonly futimesSync: FsSynchronousApi['futimesSync'] = noop;
  public readonly lchmodSync: FsSynchronousApi['lchmodSync'] = noop;
  public readonly lchownSync: FsSynchronousApi['lchownSync'] = noop;
  public readonly utimesSync: FsSynchronousApi['utimesSync'] = noop;

  // ------------------------------------------------------------ FsPromisesApi

  public readonly promises: FsPromisesApi = createPromisesApi(this);

  // ---------------------------------------------------------- FsCommonObjects

  public readonly F_OK = constants.F_OK;
  public readonly R_OK = constants.R_OK;
  public readonly W_OK = constants.W_OK;
  public readonly X_OK = constants.X_OK;
  public readonly constants = constants;
  public readonly Dirent = FsaNodeDirent;
  public readonly Stats = FsaNodeStats<any>;
  public readonly WriteStream = FsaNodeWriteStream;
  public readonly StatFs = 0 as any;
  public readonly Dir = 0 as any;
  public readonly StatsWatcher = 0 as any;
  public readonly FSWatcher = 0 as any;
  public readonly ReadStream = 0 as any;
}
