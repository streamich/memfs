import {FileHandle} from './FileHandle';
import {promisify} from './util';
import type * as opts from './types/options';
import type * as misc from './types/misc';
import type {FsCallbackApi, FsPromisesApi} from './types';

export function createPromisesApi(vol: FsCallbackApi): null | FsPromisesApi {
  if (typeof Promise === 'undefined') return null;
  return {
    FileHandle,

    access(path: misc.PathLike, mode?: number): Promise<void> {
      return promisify(vol, 'access')(path, mode);
    },

    appendFile(path: misc.TFileHandle, data: misc.TData, options?: opts.IAppendFileOptions | string): Promise<void> {
      return promisify(vol, 'appendFile')(path instanceof FileHandle ? path.fd : (path as misc.PathLike), data, options);
    },

    chmod(path: misc.PathLike, mode: misc.TMode): Promise<void> {
      return promisify(vol, 'chmod')(path, mode);
    },

    chown(path: misc.PathLike, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'chown')(path, uid, gid);
    },

    copyFile(src: misc.PathLike, dest: misc.PathLike, flags?: misc.TFlagsCopy): Promise<void> {
      return promisify(vol, 'copyFile')(src, dest, flags);
    },

    lchmod(path: misc.PathLike, mode: misc.TMode): Promise<void> {
      return promisify(vol, 'lchmod')(path, mode);
    },

    lchown(path: misc.PathLike, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'lchown')(path, uid, gid);
    },

    link(existingPath: misc.PathLike, newPath: misc.PathLike): Promise<void> {
      return promisify(vol, 'link')(existingPath, newPath);
    },

    lstat(path: misc.PathLike, options?: opts.IStatOptions): Promise<misc.IStats> {
      return promisify(vol, 'lstat')(path, options);
    },

    mkdir(path: misc.PathLike, options?: misc.TMode | opts.IMkdirOptions): Promise<void> {
      return promisify(vol, 'mkdir')(path, options);
    },

    mkdtemp(prefix: string, options?: opts.IOptions) {
      return promisify(vol, 'mkdtemp')(prefix, options);
    },

    open(path: misc.PathLike, flags: misc.TFlags, mode?: misc.TMode) {
      return promisify(vol, 'open', fd => new FileHandle(vol, fd))(path, flags, mode);
    },

    readdir(path: misc.PathLike, options?: opts.IReaddirOptions | string): Promise<misc.TDataOut[] | misc.IDirent[]> {
      return promisify(vol, 'readdir')(path, options);
    },

    readFile(id: misc.TFileHandle, options?: opts.IReadFileOptions | string): Promise<misc.TDataOut> {
      return promisify(vol, 'readFile')(id instanceof FileHandle ? id.fd : (id as misc.PathLike), options);
    },

    readlink(path: misc.PathLike, options?: opts.IOptions): Promise<misc.TDataOut> {
      return promisify(vol, 'readlink')(path, options);
    },

    realpath(path: misc.PathLike, options?: opts.IRealpathOptions | string): Promise<misc.TDataOut> {
      return promisify(vol, 'realpath')(path, options);
    },

    rename(oldPath: misc.PathLike, newPath: misc.PathLike): Promise<void> {
      return promisify(vol, 'rename')(oldPath, newPath);
    },

    rmdir(path: misc.PathLike, options?: opts.IRmdirOptions): Promise<void> {
      return promisify(vol, 'rmdir')(path, options);
    },

    rm(path: misc.PathLike, options?: opts.IRmOptions): Promise<void> {
      return promisify(vol, 'rm')(path, options);
    },

    stat(path: misc.PathLike, options?: opts.IStatOptions): Promise<misc.IStats> {
      return promisify(vol, 'stat')(path, options);
    },

    symlink(target: misc.PathLike, path: misc.PathLike, type?: misc.symlink.Type): Promise<void> {
      return promisify(vol, 'symlink')(target, path, type);
    },

    truncate(path: misc.PathLike, len?: number): Promise<void> {
      return promisify(vol, 'truncate')(path, len);
    },

    unlink(path: misc.PathLike): Promise<void> {
      return promisify(vol, 'unlink')(path);
    },

    utimes(path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime): Promise<void> {
      return promisify(vol, 'utimes')(path, atime, mtime);
    },

    writeFile(id: misc.TFileHandle, data: misc.TData, options?: opts.IWriteFileOptions): Promise<void> {
      return promisify(vol, 'writeFile')(id instanceof FileHandle ? id.fd : (id as misc.PathLike), data, options);
    },
  };
}
