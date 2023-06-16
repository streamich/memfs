import type { PathLike, symlink } from 'fs';
import type * as misc from './misc';
import type * as opts from './options';

export interface FsCallbackApi {
  open(path: PathLike, flags: misc.TFlags, /* ... */ callback: misc.TCallback<number>);
  open(path: PathLike, flags: misc.TFlags, mode: misc.TMode, callback: misc.TCallback<number>);
  close(fd: number, callback: misc.TCallback<void>): void;
  read(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
    callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void,
  ): void;
  readFile(id: misc.TFileId, callback: misc.TCallback<misc.TDataOut>);
  readFile(id: misc.TFileId, options: opts.IReadFileOptions | string, callback: misc.TCallback<misc.TDataOut>);
  write(fd: number, buffer: Buffer | ArrayBufferView | DataView, callback: (...args) => void);
  write(fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, callback: (...args) => void);
  write(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    callback: (...args) => void,
  );
  write(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
    callback: (...args) => void,
  );
  write(fd: number, str: string, callback: (...args) => void);
  write(fd: number, str: string, position: number, callback: (...args) => void);
  write(fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args) => void);
  writeFile(id: misc.TFileId, data: misc.TData, callback: misc.TCallback<void>);
  writeFile(id: misc.TFileId, data: misc.TData, options: opts.IWriteFileOptions | string, callback: misc.TCallback<void>);
  copyFile(src: PathLike, dest: PathLike, callback: misc.TCallback<void>);
  copyFile(src: PathLike, dest: PathLike, flags: misc.TFlagsCopy, callback: misc.TCallback<void>);
  link(existingPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>): void;
  unlink(path: PathLike, callback: misc.TCallback<void>): void;
  symlink(target: PathLike, path: PathLike, callback: misc.TCallback<void>);
  symlink(target: PathLike, path: PathLike, type: symlink.Type, callback: misc.TCallback<void>);
  realpath(path: PathLike, callback: misc.TCallback<misc.TDataOut>);
  realpath(path: PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<misc.TDataOut>);
  lstat(path: PathLike, callback: misc.TCallback<misc.IStats>): void;
  lstat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  stat(path: PathLike, callback: misc.TCallback<misc.IStats>): void;
  stat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  fstat(fd: number, callback: misc.TCallback<misc.IStats>): void;
  fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<misc.IStats>): void;
  rename(oldPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>): void;
  exists(path: PathLike, callback: (exists: boolean) => void): void;
  access(path: PathLike, callback: misc.TCallback<void>);
  access(path: PathLike, mode: number, callback: misc.TCallback<void>);
  appendFile(id: misc.TFileId, data: misc.TData, callback: misc.TCallback<void>);
  appendFile(id: misc.TFileId, data: misc.TData, options: opts.IAppendFileOptions | string, callback: misc.TCallback<void>);
  readdir(path: PathLike, callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>);
  readdir(path: PathLike, options: opts.IReaddirOptions | string, callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>);
  readlink(path: PathLike, callback: misc.TCallback<misc.TDataOut>);
  readlink(path: PathLike, options: opts.IOptions, callback: misc.TCallback<misc.TDataOut>);
  fsyncSync(fd: number): void;
  fsync(fd: number, callback: misc.TCallback<void>): void;
  fdatasync(fd: number, callback: misc.TCallback<void>): void;
  ftruncate(fd: number, callback: misc.TCallback<void>);
  ftruncate(fd: number, len: number, callback: misc.TCallback<void>);
  truncate(id: misc.TFileId, callback: misc.TCallback<void>);
  truncate(id: misc.TFileId, len: number, callback: misc.TCallback<void>);
  futimes(fd: number, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void;
  utimes(path: PathLike, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void;
  mkdir(path: PathLike, callback: misc.TCallback<void>);
  mkdir(path: PathLike, mode: misc.TMode | (opts.IMkdirOptions & { recursive?: false }), callback: misc.TCallback<void>);
  mkdir(path: PathLike, mode: opts.IMkdirOptions & { recursive: true }, callback: misc.TCallback<string>);
  mkdir(path: PathLike, mode: misc.TMode | opts.IMkdirOptions, callback: misc.TCallback<string>);
  mkdirp(path: PathLike, callback: misc.TCallback<string>);
  mkdirp(path: PathLike, mode: misc.TMode, callback: misc.TCallback<string>);
  mkdtemp(prefix: string, callback: misc.TCallback<void>): void;
  mkdtemp(prefix: string, options: opts.IOptions, callback: misc.TCallback<void>);
  rmdir(path: PathLike, callback: misc.TCallback<void>);
  rmdir(path: PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>);
  rm(path: PathLike, callback: misc.TCallback<void>): void;
  rm(path: PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void;
  fchmod(fd: number, mode: misc.TMode, callback: misc.TCallback<void>): void;
  chmod(path: PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void;
  lchmod(path: PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void;
  fchown(fd: number, uid: number, gid: number, callback: misc.TCallback<void>): void;
  chown(path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void;
  lchown(path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void;
  watchFile(path: PathLike, listener: (curr: misc.IStats, prev: misc.IStats) => void): misc.IStatWatcher;
  watchFile(path: PathLike, options: opts.IWatchFileOptions, listener: (curr: misc.IStats, prev: misc.IStats) => void): misc.IStatWatcher;
  unwatchFile(path: PathLike, listener?: (curr: misc.IStats, prev: misc.IStats) => void): void;
  createReadStream(path: PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream;
  createWriteStream(path: PathLike, options?: opts.IWriteStreamOptions | string): misc.IWriteStream;
  watch(
    path: PathLike,
    options?: opts.IWatchOptions | string,
    listener?: (eventType: string, filename: string) => void,
  ): misc.IFSWatcher;
}
