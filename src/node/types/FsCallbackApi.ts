import type * as misc from './misc';
import type * as opts from './options';

export interface FsCallbackApi {
  access(path: misc.PathLike, callback: misc.TCallback<void>);
  access(path: misc.PathLike, mode: number, callback: misc.TCallback<void>);
  appendFile(id: misc.TFileId, data: misc.TData, callback: misc.TCallback<void>);
  appendFile(
    id: misc.TFileId,
    data: misc.TData,
    options: opts.IAppendFileOptions | string,
    callback: misc.TCallback<void>,
  );
  chmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void;
  chown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void;
  close(fd: number, callback: misc.TCallback<void>): void;
  copyFile(src: misc.PathLike, dest: misc.PathLike, callback: misc.TCallback<void>);
  copyFile(src: misc.PathLike, dest: misc.PathLike, flags: misc.TFlagsCopy, callback: misc.TCallback<void>);
  cp(src: string | URL, dest: string | URL, callback: misc.TCallback<void>);
  cp(src: string | URL, dest: string | URL, options: opts.ICpOptions, callback: misc.TCallback<void>);
  createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream;
  createWriteStream(path: misc.PathLike, options?: opts.IWriteStreamOptions | string): misc.IWriteStream;
  exists(path: misc.PathLike, callback: (exists: boolean) => void): void;
  fchmod(fd: number, mode: misc.TMode, callback: misc.TCallback<void>): void;
  fchown(fd: number, uid: number, gid: number, callback: misc.TCallback<void>): void;
  fdatasync(fd: number, callback: misc.TCallback<void>): void;
  fsync(fd: number, callback: misc.TCallback<void>): void;
  fstat(fd: number, callback: misc.TCallback<misc.IStats>): void;
  fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<misc.IStats>): void;
  ftruncate(fd: number, callback: misc.TCallback<void>);
  ftruncate(fd: number, len: number, callback: misc.TCallback<void>);
  futimes(fd: number, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void;
  lchmod(path: misc.PathLike, mode: misc.TMode, callback: misc.TCallback<void>): void;
  lchown(path: misc.PathLike, uid: number, gid: number, callback: misc.TCallback<void>): void;
  lutimes(
    path: misc.PathLike,
    atime: number | string | Date,
    mtime: number | string | Date,
    callback: misc.TCallback<void>,
  ): void;
  link(existingPath: misc.PathLike, newPath: misc.PathLike, callback: misc.TCallback<void>): void;
  lstat(path: misc.PathLike, callback: misc.TCallback<misc.IStats>): void;
  lstat(path: misc.PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  mkdir(path: misc.PathLike, callback: misc.TCallback<void>);
  mkdir(
    path: misc.PathLike,
    mode: misc.TMode | (opts.IMkdirOptions & { recursive?: false }),
    callback: misc.TCallback<void>,
  );
  mkdir(path: misc.PathLike, mode: opts.IMkdirOptions & { recursive: true }, callback: misc.TCallback<string>);
  mkdir(path: misc.PathLike, mode: misc.TMode | opts.IMkdirOptions, callback: misc.TCallback<string>);
  mkdtemp(prefix: string, callback: misc.TCallback<string>): void;
  mkdtemp(prefix: string, options: opts.IOptions, callback: misc.TCallback<string>);
  open(path: misc.PathLike, flags: misc.TFlags, callback: misc.TCallback<number>);
  open(path: misc.PathLike, flags: misc.TFlags, mode: misc.TMode, callback: misc.TCallback<number>);
  openAsBlob(path: misc.PathLike, options?: opts.IOpenAsBlobOptions): Promise<Blob>;
  opendir(path: misc.PathLike, options: opts.IOpendirOptions, callback: misc.TCallback<misc.IDir>): void;
  read(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
    callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void,
  ): void;
  readdir(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>);
  readdir(
    path: misc.PathLike,
    options: opts.IReaddirOptions | string,
    callback: misc.TCallback<misc.TDataOut[] | misc.IDirent[]>,
  );
  readFile(id: misc.TFileId, callback: misc.TCallback<misc.TDataOut>);
  readFile(id: misc.TFileId, options: opts.IReadFileOptions | string, callback: misc.TCallback<misc.TDataOut>);
  readlink(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut>);
  readlink(path: misc.PathLike, options: opts.IOptions, callback: misc.TCallback<misc.TDataOut>);
  readv(fd: number, buffers: ArrayBufferView[], callback: misc.TCallback2<number, ArrayBufferView[]>): void;
  readv(
    fd: number,
    buffers: ArrayBufferView[],
    position: number | null,
    callback: misc.TCallback2<number, ArrayBufferView[]>,
  ): void;
  realpath(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut>);
  realpath(path: misc.PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<misc.TDataOut>);
  realpathNative(path: misc.PathLike, callback: misc.TCallback<misc.TDataOut>);
  realpathNative(path: misc.PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<misc.TDataOut>);
  rename(oldPath: misc.PathLike, newPath: misc.PathLike, callback: misc.TCallback<void>): void;
  rmdir(path: misc.PathLike, callback: misc.TCallback<void>);
  rmdir(path: misc.PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>);
  rm(path: misc.PathLike, callback: misc.TCallback<void>): void;
  rm(path: misc.PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void;
  stat(path: misc.PathLike, callback: misc.TCallback<misc.IStats>): void;
  stat(path: misc.PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStats>): void;
  statfs(path: misc.PathLike, callback: misc.TCallback<misc.IStatFs>): void;
  statfs(path: misc.PathLike, options: opts.IStatOptions, callback: misc.TCallback<misc.IStatFs>): void;
  symlink(target: misc.PathLike, path: misc.PathLike, callback: misc.TCallback<void>);
  symlink(target: misc.PathLike, path: misc.PathLike, type: misc.symlink.Type, callback: misc.TCallback<void>);
  truncate(id: misc.PathLike, callback: misc.TCallback<void>);
  truncate(id: misc.PathLike, len: number, callback: misc.TCallback<void>);
  unlink(path: misc.PathLike, callback: misc.TCallback<void>): void;
  unwatchFile(path: misc.PathLike, listener?: (curr: misc.IStats, prev: misc.IStats) => void): void;
  utimes(path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime, callback: misc.TCallback<void>): void;
  watch(
    path: misc.PathLike,
    options?: opts.IWatchOptions | string,
    listener?: (eventType: string, filename: string) => void,
  ): misc.IFSWatcher;
  watchFile(path: misc.PathLike, listener: (curr: misc.IStats, prev: misc.IStats) => void): misc.IStatWatcher;
  watchFile(
    path: misc.PathLike,
    options: opts.IWatchFileOptions,
    listener: (curr: misc.IStats, prev: misc.IStats) => void,
  ): misc.IStatWatcher;
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
  writeFile(
    id: misc.TFileId,
    data: misc.TData,
    options: opts.IWriteFileOptions | string,
    callback: misc.TCallback<void>,
  );
  writev(fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
  writev(fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
}

export type WritevCallback = (err: Error | null, bytesWritten?: number, buffers?: ArrayBufferView[]) => void;
