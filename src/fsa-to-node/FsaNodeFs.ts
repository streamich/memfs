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
} from '../node/options';
import {
  createError,
  dataToBuffer,
  flagsToNumber,
  genRndStr6,
  getWriteArgs,
  isFd,
  isWin,
  modeToNumber,
  nullCheck,
  pathToFilename,
  validateCallback,
  validateFd,
} from '../node/util';
import { pathToLocation, testDirectoryIsWritable } from './util';
import { ERRSTR, MODE } from '../node/constants';
import { strToEncoding } from '../encoding';
import { FsaToNodeConstants } from './constants';
import { bufferToEncoding } from '../volume';
import { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import { FsaNodeDirent } from './FsaNodeDirent';
import {FLAG} from '../consts/FLAG';
import {AMODE} from '../consts/AMODE';
import type { FsCallbackApi, FsPromisesApi } from '../node/types';
import type * as misc from '../node/types/misc';
import type * as opts from '../node/types/options';
import type * as fsa from '../fsa/types';

const notImplemented: (...args: any[]) => any = () => {
  throw new Error('Not implemented');
};

/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
export class FsaNodeFs implements FsCallbackApi {
  public static fd: number = 0x7fffffff;

  public readonly promises: FsPromisesApi = createPromisesApi(this);
  public readonly fds = new Map<number, FsaNodeFsOpenFile>();

  public constructor(protected readonly root: fsa.IFileSystemDirectoryHandle) {}

  /**
   * A list of reusable (opened and closed) file descriptors, that should be
   * used first before creating a new file descriptor.
   */
  releasedFds: number[] = [];

  private newFdNumber(): number {
    const releasedFd = this.releasedFds.pop();
    return typeof releasedFd === 'number' ? releasedFd : FsaNodeFs.fd--;
  }

  /**
   * @param path Path from root to the new folder.
   * @param create Whether to create the folders if they don't exist.
   */
  private async getDir(path: string[], create: boolean, funcName?: string): Promise<fsa.IFileSystemDirectoryHandle> {
    let curr: fsa.IFileSystemDirectoryHandle = this.root;
    const options: fsa.GetDirectoryHandleOptions = { create };
    try {
      for (const name of path) curr = await curr.getDirectoryHandle(name, options);
    } catch (error) {
      if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
        throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
      throw error;
    }
    return curr;
  }

  private async getFile(path: string[], name: string, funcName?: string, create?: boolean): Promise<fsa.IFileSystemFileHandle> {
    const dir = await this.getDir(path, false, funcName);
    const file = await dir.getFileHandle(name, { create });
    return file;
  }

  private async getFileOrDir(path: string[], name: string, funcName?: string, create?: boolean): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle> {
    const dir = await this.getDir(path, false, funcName);
    try {
      const file = await dir.getFileHandle(name);
      return file;
    } catch (error) {
      if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
        return await dir.getDirectoryHandle(name);
      throw error;
    }
  }

  private async getFileByFd(fd: number, funcName?: string): Promise<FsaNodeFsOpenFile> {
    if (!isFd(fd)) throw TypeError(ERRSTR.FD);
    const file = this.fds.get(fd);
    if (!file) throw createError('EBADF', funcName);
    return file;
  }

  private async getFileById(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle> {
    if (typeof id === 'number') return (await this.getFileByFd(id, funcName)).file;
    const filename = pathToFilename(id);
    const [folder, name] = pathToLocation(filename);
    return await this.getFile(folder, name, funcName);
  }

  private async getFileByIdOrCreate(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle> {
    if (typeof id === 'number') return (await this.getFileByFd(id, funcName)).file;
    const filename = pathToFilename(id);
    const [folder, name] = pathToLocation(filename);
    const dir = await this.getDir(folder, false, funcName);
    return await dir.getFileHandle(name, { create: true });
  }


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
    const [folder, name] = pathToLocation(filename);
    const createIfMissing = !!(flagsNum & FLAG.O_CREAT);
    this.getFile(folder, name, 'open', createIfMissing)
      .then(file => {
        const fd = this.newFdNumber();
        const openFile = new FsaNodeFsOpenFile(fd, modeNum, flagsNum, file);
        this.fds.set(fd, openFile);
        callback(null, fd);
      })
      .catch(error => callback(error));
  };

  public readonly close: FsCallbackApi['close'] = (fd: number, callback: misc.TCallback<void>): void => {
    validateFd(fd);
    this.getFileByFd(fd, 'close')
      .then(file => file.close())
      .then(
        () => {
          this.fds.delete(fd);
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
    throw new Error('Not implemented');
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

  public readonly write: FsCallbackApi['write'] = (fd: number, a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) => {
    const [, asStr, buf, offset, length, position, cb] = getWriteArgs(fd, a, b, c, d, e);
    (async () => {
      const openFile = await this.getFileByFd(fd, 'write');
      const data = buf.subarray(offset, offset + length);
      await openFile.write(data, position);
      return length;
    })().then((bytesWritten) => cb(null, bytesWritten, asStr ? a : buf), (error) => cb(error));
  };

  writeFile(id: misc.TFileId, data: misc.TData, callback: misc.TCallback<void>);
  writeFile(
    id: misc.TFileId,
    data: misc.TData,
    options: opts.IWriteFileOptions | string,
    callback: misc.TCallback<void>,
  );
  writeFile(
    id: misc.TFileId,
    data: misc.TData,
    a: misc.TCallback<void> | opts.IWriteFileOptions | string,
    b?: misc.TCallback<void>,
  ) {
    throw new Error('Not implemented');
  }

  copyFile(src: misc.PathLike, dest: misc.PathLike, callback: misc.TCallback<void>);
  copyFile(src: misc.PathLike, dest: misc.PathLike, flags: misc.TFlagsCopy, callback: misc.TCallback<void>);
  copyFile(src: misc.PathLike, dest: misc.PathLike, a, b?) {
    throw new Error('Not implemented');
  }

  link(existingPath: misc.PathLike, newPath: misc.PathLike, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

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

  symlink(target: misc.PathLike, path: misc.PathLike, callback: misc.TCallback<void>);
  symlink(target: misc.PathLike, path: misc.PathLike, type: misc.symlink.Type, callback: misc.TCallback<void>);
  symlink(
    target: misc.PathLike,
    path: misc.PathLike,
    a: misc.symlink.Type | misc.TCallback<void>,
    b?: misc.TCallback<void>,
  ) {
    throw new Error('Not implemented');
  }

  realpath(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut>);
  realpath(path: misc.PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<misc.TDataOut>);
  realpath(
    path: misc.PathLike,
    a: misc.TCallback<misc.TDataOut> | opts.IRealpathOptions | string,
    b?: misc.TCallback<misc.TDataOut>,
  ) {
    throw new Error('Not implemented');
  }

  lstat(path: misc.PathLike, callback: misc.TCallback<misc.IStats>): void;
  lstat(path: misc.PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  lstat(
    path: misc.PathLike,
    a: misc.TCallback<misc.IStats> | opts.IStatOptions,
    b?: misc.TCallback<misc.IStats>,
  ): void {
    throw new Error('Not implemented');
  }

  stat(path: misc.PathLike, callback: misc.TCallback<misc.IStats>): void;
  stat(path: misc.PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  stat(path: misc.PathLike, a: misc.TCallback<misc.IStats> | opts.IStatOptions, b?: misc.TCallback<misc.IStats>): void {
    throw new Error('Not implemented');
  }

  fstat(fd: number, callback: misc.TCallback<misc.IStats>): void;
  fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<misc.IStats>): void;
  fstat(fd: number, a: misc.TCallback<misc.IStats> | opts.IFStatOptions, b?: misc.TCallback<misc.IStats>): void {
    throw new Error('Not implemented');
  }

  rename(oldPath: misc.PathLike, newPath: misc.PathLike, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  public readonly exists: FsCallbackApi['exists'] = (path: misc.PathLike, callback: (exists: boolean) => void): void => {
    const filename = pathToFilename(path);
    if (typeof callback !== 'function') throw Error(ERRSTR.CB);
    const [folder, name] = pathToLocation(filename);
    (async () => {
      // const stats = await new Promise();
    })().then(() => callback(true), () => callback(false));
  };

  public readonly access: FsCallbackApi['access'] = (path: misc.PathLike, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) => {
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
      const node = await this.getFileOrDir(folder, name, 'access');
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
    })().then(() => callback(null), error => callback(error));
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
    folder.push(name);
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
    this.getFileByFd(fd)
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
      .then(dir => dir.getDirectoryHandle(name).then(() => dir))
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

  fchmod(fd: number, mode: misc.TMode, callback: misc.TCallback<void>): void {
    callback(null);
  }

  chmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void {
    callback(null);
  }

  lchmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void {
    callback(null);
  }

  fchown(fd: number, uid: number, gid: number, callback: misc.TCallback<void>): void {
    callback(null);
  }

  chown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void {
    callback(null);
  }

  lchown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void {
    callback(null);
  }

  public readonly watchFile: FsCallbackApi['watchFile'] = notImplemented;
  public readonly unwatchFile: FsCallbackApi['unwatchFile'] = notImplemented;
  public readonly createReadStream: FsCallbackApi['createReadStream'] = notImplemented;
  public readonly createWriteStream: FsCallbackApi['createWriteStream'] = notImplemented;
  public readonly watch: FsCallbackApi['watch'] = notImplemented;
}
