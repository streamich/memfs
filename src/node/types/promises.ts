import * as misc from './misc';
import * as opts from './options';

export interface FsPromisesApi {
  FileHandle: new (...args: unknown[]) => misc.IFileHandle;
  access(path: misc.PathLike, mode?: number): Promise<void>;
  appendFile(path: misc.TFileHandle, data: misc.TData, options?: opts.IAppendFileOptions | string): Promise<void>;
  chmod(path: misc.PathLike, mode: misc.TMode): Promise<void>;
  chown(path: misc.PathLike, uid: number, gid: number): Promise<void>;
  copyFile(src: misc.PathLike, dest: misc.PathLike, flags?: misc.TFlagsCopy): Promise<void>;
  lchmod(path: misc.PathLike, mode: misc.TMode): Promise<void>;
  lchown(path: misc.PathLike, uid: number, gid: number): Promise<void>;
  link(existingPath: misc.PathLike, newPath: misc.PathLike): Promise<void>;
  lstat(path: misc.PathLike, options?: opts.IStatOptions): Promise<misc.IStats>;
  mkdir(path: misc.PathLike, options?: misc.TMode | opts.IMkdirOptions): Promise<void>;
  mkdtemp(prefix: string, options?: opts.IOptions): Promise<misc.TDataOut>;
  open(path: misc.PathLike, flags: misc.TFlags, mode?: misc.TMode): Promise<misc.IFileHandle>;
  readdir(path: misc.PathLike, options?: opts.IReaddirOptions | string): Promise<misc.TDataOut[] | misc.IDirent[]>;
  readFile(id: misc.TFileHandle, options?: opts.IReadFileOptions | string): Promise<misc.TDataOut>;
  readlink(path: misc.PathLike, options?: opts.IOptions): Promise<misc.TDataOut>;
  realpath(path: misc.PathLike, options?: opts.IRealpathOptions | string): Promise<misc.TDataOut>;
  rename(oldPath: misc.PathLike, newPath: misc.PathLike): Promise<void>;
  rmdir(path: misc.PathLike, options?: opts.IRmdirOptions): Promise<void>;
  rm(path: misc.PathLike, options?: opts.IRmOptions): Promise<void>;
  stat(path: misc.PathLike, options?: opts.IStatOptions): Promise<misc.IStats>;
  symlink(target: misc.PathLike, path: misc.PathLike, type?: misc.symlink.Type): Promise<void>;
  truncate(path: misc.PathLike, len?: number): Promise<void>;
  unlink(path: misc.PathLike): Promise<void>;
  utimes(path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime): Promise<void>;
  writeFile(id: misc.TFileHandle, data: misc.TData, options?: opts.IWriteFileOptions): Promise<void>;
}
