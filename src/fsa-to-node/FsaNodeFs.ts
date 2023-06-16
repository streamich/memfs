import { createPromisesApi } from '../node/promises';
import { getMkdirOptions } from '../node/options';
import { createError, modeToNumber, pathToFilename, validateCallback } from '../node/util';
import { pathToLocation } from './util';
import type { FsCallbackApi, FsPromisesApi } from '../node/types';
import type * as misc from '../node/types/misc';
import type * as opts from '../node/types/options';
import type * as fsa from '../fsa/types';

const notImplemented: (...args: unknown[]) => unknown = () => {
  throw new Error('Not implemented');
};

/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
export class FsaNodeFs implements FsCallbackApi {
  public readonly promises: FsPromisesApi = createPromisesApi(this);

  public constructor(protected readonly root: fsa.IFileSystemDirectoryHandle) {}

  public readonly open: FsCallbackApi['open'] = (
    path: misc.PathLike,
    flags: misc.TFlags,
    a?: misc.TMode | misc.TCallback<number>,
    b?: misc.TCallback<number> | string,
  ) => {
    throw new Error('Not implemented');
  };

  public readonly close: FsCallbackApi['close'] = (fd: number, callback: misc.TCallback<void>): void => {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  };

  public readonly write: FsCallbackApi['write'] = (fd: number, a?, b?, c?, d?, e?) => {
    throw new Error('Not implemented');
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

  unlink(path: misc.PathLike, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

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

  exists(path: misc.PathLike, callback: (exists: boolean) => void): void {
    throw new Error('Not implemented');
  }

  access(path: misc.PathLike, callback: misc.TCallback<void>);
  access(path: misc.PathLike, mode: number, callback: misc.TCallback<void>);
  access(path: misc.PathLike, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) {
    throw new Error('Not implemented');
  }

  appendFile(id: misc.TFileId, data: misc.TData, callback: misc.TCallback<void>);
  appendFile(
    id: misc.TFileId,
    data: misc.TData,
    options: opts.IAppendFileOptions | string,
    callback: misc.TCallback<void>,
  );
  appendFile(id: misc.TFileId, data: misc.TData, a, b?) {
    throw new Error('Not implemented');
  }

  readdir(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>);
  readdir(
    path: misc.PathLike,
    options: opts.IReaddirOptions | string,
    callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>,
  );
  readdir(path: misc.PathLike, a?, b?) {
    throw new Error('Not implemented');
  }

  readlink(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut>);
  readlink(path: misc.PathLike, options: opts.IOptions, callback: misc.TCallback<misc.TDataOut>);
  readlink(path: misc.PathLike, a: misc.TCallback<misc.TDataOut> | opts.IOptions, b?: misc.TCallback<misc.TDataOut>) {
    throw new Error('Not implemented');
  }

  fsyncSync(fd: number): void {
    throw new Error('Not implemented');
  }

  fsync(fd: number, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  fdatasync(fd: number, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  ftruncate(fd: number, callback: misc.TCallback<void>);
  ftruncate(fd: number, len: number, callback: misc.TCallback<void>);
  ftruncate(fd: number, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) {
    throw new Error('Not implemented');
  }

  truncate(id: misc.TFileId, callback: misc.TCallback<void>);
  truncate(id: misc.TFileId, len: number, callback: misc.TCallback<void>);
  truncate(id: misc.TFileId, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) {
    throw new Error('Not implemented');
  }

  futimes(fd: number, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  utimes(path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  /**
   * @param path Path from root to the new folder.
   * @param create Whether to create the folders if they don't exist.
   */
  private async getDir(path: string[], create: boolean): Promise<fsa.IFileSystemDirectoryHandle> {
    let curr: fsa.IFileSystemDirectoryHandle = this.root;
    const options: fsa.GetDirectoryHandleOptions = { create };
    for (const name of path) curr = await curr.getDirectoryHandle(name, options);
    return curr;
  }

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
              case 'TypeMismatchError': {
                const err = createError('ENOTDIR', 'mkdir', folder.join('/'));
                callback(err);
                return;
              }
            }
          }
          callback(error);
        },
      );
  };

  mkdtemp(prefix: string, callback: misc.TCallback<void>): void;
  mkdtemp(prefix: string, options: opts.IOptions, callback: misc.TCallback<void>);
  mkdtemp(prefix: string, a: misc.TCallback<void> | opts.IOptions, b?: misc.TCallback<void>) {
    throw new Error('Not implemented');
  }

  rmdir(path: misc.PathLike, callback: misc.TCallback<void>);
  rmdir(path: misc.PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>);
  rmdir(path: misc.PathLike, a: misc.TCallback<void> | opts.IRmdirOptions, b?: misc.TCallback<void>) {
    throw new Error('Not implemented');
  }

  rm(path: misc.PathLike, callback: misc.TCallback<void>): void;
  rm(path: misc.PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void;
  rm(path: misc.PathLike, a: misc.TCallback<void> | opts.IRmOptions, b?: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  fchmod(fd: number, mode: misc.TMode, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  chmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  lchmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  fchown(fd: number, uid: number, gid: number, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  chown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  lchown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void {
    throw new Error('Not implemented');
  }

  watchFile(path: misc.PathLike, listener: (curr: misc.IStats, prev: misc.IStats) => void): misc.IStatWatcher;
  watchFile(
    path: misc.PathLike,
    options: opts.IWatchFileOptions,
    listener: (curr: misc.IStats, prev: misc.IStats) => void,
  ): misc.IStatWatcher;
  watchFile(path: misc.PathLike, a, b?): misc.IStatWatcher {
    throw new Error('Not implemented');
  }

  unwatchFile(path: misc.PathLike, listener?: (curr: misc.IStats, prev: misc.IStats) => void): void {
    throw new Error('Not implemented');
  }

  createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream {
    throw new Error('Not implemented');
  }

  createWriteStream(path: misc.PathLike, options?: opts.IWriteStreamOptions | string): misc.IWriteStream {
    throw new Error('Not implemented');
  }

  watch(
    path: misc.PathLike,
    options?: opts.IWatchOptions | string,
    listener?: (eventType: string, filename: string) => void,
  ): misc.IFSWatcher {
    throw new Error('Not implemented');
  }
}
