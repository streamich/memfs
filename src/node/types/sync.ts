import type { PathLike, symlink } from 'fs';
import type * as misc from './misc';
import type * as opts from './options';

export interface FsSynchronousApi {
  openSync(path: PathLike, flags: misc.TFlags, mode?: misc.TMode): number;
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
  copyFileSync(src: PathLike, dest: PathLike, flags?: misc.TFlagsCopy): void;
  linkSync(existingPath: PathLike, newPath: PathLike): void;
  unlinkSync(path: PathLike): void;
  symlinkSync(target: PathLike, path: PathLike, type?: symlink.Type): void;
  realpathSync(path: PathLike, options?: opts.IRealpathOptions | string): misc.TDataOut;
  lstatSync(path: PathLike): misc.IStats<number>;
  lstatSync(path: PathLike, options: { throwIfNoEntry?: true | undefined }): misc.IStats<number>;
  lstatSync(path: PathLike, options: { bigint: false; throwIfNoEntry?: true | undefined }): misc.IStats<number>;
  lstatSync(path: PathLike, options: { bigint: true; throwIfNoEntry?: true | undefined }): misc.IStats<bigint>;
  lstatSync(path: PathLike, options: { throwIfNoEntry: false }): misc.IStats<number> | undefined;
  lstatSync(path: PathLike, options: { bigint: false; throwIfNoEntry: false }): misc.IStats<number> | undefined;
  lstatSync(path: PathLike, options: { bigint: true; throwIfNoEntry: false }): misc.IStats<bigint> | undefined;
  statSync(path: PathLike): misc.IStats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry?: true }): misc.IStats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry: false }): misc.IStats<number> | undefined;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry?: true }): misc.IStats<number>;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry?: true }): misc.IStats<bigint>;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry: false }): misc.IStats<number> | undefined;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry: false }): misc.IStats<bigint> | undefined;
  fstatSync(fd: number): misc.IStats<number>;
  fstatSync(fd: number, options: { bigint: false }): misc.IStats<number>;
  fstatSync(fd: number, options: { bigint: true }): misc.IStats<bigint>;
  renameSync(oldPath: PathLike, newPath: PathLike): void;
  existsSync(path: PathLike): boolean;
  accessSync(path: PathLike, mode?: number): void;
  appendFileSync(id: misc.TFileId, data: misc.TData, options?: opts.IAppendFileOptions | string): void;
  readdirSync(path: PathLike, options?: opts.IReaddirOptions | string): misc.TDataOut[] | misc.IDirent[];
  readlinkSync(path: PathLike, options?: opts.IOptions): misc.TDataOut;
  fdatasyncSync(fd: number): void;
  ftruncateSync(fd: number, len?: number): void;
  truncateSync(id: misc.TFileId, len?: number): void;
  futimesSync(fd: number, atime: misc.TTime, mtime: misc.TTime): void;
  utimesSync(path: PathLike, atime: misc.TTime, mtime: misc.TTime): void;
  mkdirSync(path: PathLike, options: opts.IMkdirOptions & { recursive: true }): string | undefined;
  mkdirSync(path: PathLike, options?: misc.TMode | (opts.IMkdirOptions & { recursive?: false })): void;
  mkdirSync(path: PathLike, options?: misc.TMode | opts.IMkdirOptions): string | undefined;
  mkdirpSync(path: PathLike, mode?: misc.TMode): void;
  mkdtempSync(prefix: string, options?: opts.IOptions): misc.TDataOut;
  rmdirSync(path: PathLike, options?: opts.IRmdirOptions): void;
  rmSync(path: PathLike, options?: opts.IRmOptions): void;
  fchmodSync(fd: number, mode: misc.TMode): void;
  chmodSync(path: PathLike, mode: misc.TMode): void;
  lchmodSync(path: PathLike, mode: misc.TMode): void;
  fchownSync(fd: number, uid: number, gid: number): void;
  chownSync(path: PathLike, uid: number, gid: number): void;
  lchownSync(path: PathLike, uid: number, gid: number): void;
}
