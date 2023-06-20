import type * as misc from './misc';
import type * as opts from './options';

export interface FsSynchronousApi {
  openSync(path: misc.PathLike, flags: misc.TFlags, mode?: misc.TMode): number;
  closeSync(fd: number): void;
  readSync(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
  ): number;
  readFileSync(file: misc.TFileId, options?: opts.IReadFileOptions | string): misc.TDataOut;
  writeSync(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset?: number,
    length?: number,
    position?: number,
  ): number;
  writeSync(fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
  writeFileSync(id: misc.TFileId, data: misc.TData, options?: opts.IWriteFileOptions): void;
  copyFileSync(src: misc.PathLike, dest: misc.PathLike, flags?: misc.TFlagsCopy): void;
  linkSync(existingPath: misc.PathLike, newPath: misc.PathLike): void;
  unlinkSync(path: misc.PathLike): void;
  symlinkSync(target: misc.PathLike, path: misc.PathLike, type?: misc.symlink.Type): void;
  realpathSync(path: misc.PathLike, options?: opts.IRealpathOptions | string): misc.TDataOut;
  lstatSync(path: misc.PathLike): misc.IStats<number>;
  lstatSync(path: misc.PathLike, options: { throwIfNoEntry?: true | undefined }): misc.IStats<number>;
  lstatSync(path: misc.PathLike, options: { bigint: false; throwIfNoEntry?: true | undefined }): misc.IStats<number>;
  lstatSync(path: misc.PathLike, options: { bigint: true; throwIfNoEntry?: true | undefined }): misc.IStats<bigint>;
  lstatSync(path: misc.PathLike, options: { throwIfNoEntry: false }): misc.IStats<number> | undefined;
  lstatSync(path: misc.PathLike, options: { bigint: false; throwIfNoEntry: false }): misc.IStats<number> | undefined;
  lstatSync(path: misc.PathLike, options: { bigint: true; throwIfNoEntry: false }): misc.IStats<bigint> | undefined;
  statSync(path: misc.PathLike): misc.IStats<number>;
  statSync(path: misc.PathLike, options: { throwIfNoEntry?: true }): misc.IStats<number>;
  statSync(path: misc.PathLike, options: { throwIfNoEntry: false }): misc.IStats<number> | undefined;
  statSync(path: misc.PathLike, options: { bigint: false; throwIfNoEntry?: true }): misc.IStats<number>;
  statSync(path: misc.PathLike, options: { bigint: true; throwIfNoEntry?: true }): misc.IStats<bigint>;
  statSync(path: misc.PathLike, options: { bigint: false; throwIfNoEntry: false }): misc.IStats<number> | undefined;
  statSync(path: misc.PathLike, options: { bigint: true; throwIfNoEntry: false }): misc.IStats<bigint> | undefined;
  fstatSync(fd: number): misc.IStats<number>;
  fstatSync(fd: number, options: { bigint: false }): misc.IStats<number>;
  fstatSync(fd: number, options: { bigint: true }): misc.IStats<bigint>;
  renameSync(oldPath: misc.PathLike, newPath: misc.PathLike): void;
  existsSync(path: misc.PathLike): boolean;
  accessSync(path: misc.PathLike, mode?: number): void;
  appendFileSync(id: misc.TFileId, data: misc.TData, options?: opts.IAppendFileOptions | string): void;
  readdirSync(path: misc.PathLike, options?: opts.IReaddirOptions | string): misc.TDataOut[] | misc.IDirent[];
  readlinkSync(path: misc.PathLike, options?: opts.IOptions): misc.TDataOut;
  fsyncSync(fd: number): void;
  fdatasyncSync(fd: number): void;
  ftruncateSync(fd: number, len?: number): void;
  truncateSync(id: misc.TFileId, len?: number): void;
  futimesSync(fd: number, atime: misc.TTime, mtime: misc.TTime): void;
  utimesSync(path: misc.PathLike, atime: misc.TTime, mtime: misc.TTime): void;
  mkdirSync(path: misc.PathLike, options: opts.IMkdirOptions & { recursive: true }): string | undefined;
  mkdirSync(path: misc.PathLike, options?: misc.TMode | (opts.IMkdirOptions & { recursive?: false })): void;
  mkdirSync(path: misc.PathLike, options?: misc.TMode | opts.IMkdirOptions): string | undefined;
  mkdtempSync(prefix: string, options?: opts.IOptions): misc.TDataOut;
  rmdirSync(path: misc.PathLike, options?: opts.IRmdirOptions): void;
  rmSync(path: misc.PathLike, options?: opts.IRmOptions): void;
  fchmodSync(fd: number, mode: misc.TMode): void;
  chmodSync(path: misc.PathLike, mode: misc.TMode): void;
  lchmodSync(path: misc.PathLike, mode: misc.TMode): void;
  fchownSync(fd: number, uid: number, gid: number): void;
  chownSync(path: misc.PathLike, uid: number, gid: number): void;
  lchownSync(path: misc.PathLike, uid: number, gid: number): void;
}
