import type { PathLike, symlink } from 'fs';
import type { constants } from '../../constants';
import type { EventEmitter } from 'events';
import type { TSetTimeout } from '../../setTimeoutUnref';
import type {
  IAppendFileOptions,
  IReadFileOptions,
  IReadStreamOptions,
  IStatOptions,
  IWriteFileOptions,
} from './options';
import type { Readable, Writable } from 'stream';

export { PathLike, symlink };

export type TDataOut = string | Buffer; // Data formats we give back to users.
export type TEncodingExtended = BufferEncoding | 'buffer';
export type TFileId = PathLike | number; // Number is used as a file descriptor.
export type TData = TDataOut | ArrayBufferView | DataView; // Data formats users can give us.
export type TFlags = string | number;
export type TMode = string | number; // Mode can be a String, although docs say it should be a Number.
export type TTime = number | string | Date;
export type TCallback<TData> = (error?: IError | null, data?: TData) => void;

export interface IError extends Error {
  code?: string;
}

export type TFlagsCopy =
  | typeof constants.COPYFILE_EXCL
  | typeof constants.COPYFILE_FICLONE
  | typeof constants.COPYFILE_FICLONE_FORCE;

export type TStatNumber = number | bigint;

export interface IStats<T = TStatNumber> {
  uid: T;
  gid: T;
  rdev: T;
  blksize: T;
  ino: T;
  size: T;
  blocks: T;
  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;
  atimeMs: T;
  mtimeMs: T;
  ctimeMs: T;
  birthtimeMs: T;
  dev: T;
  mode: T;
  nlink: T;
  isDirectory(): boolean;
  isFile(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export interface IDirent {
  name: TDataOut;
  isDirectory(): boolean;
  isFile(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export interface IStatWatcher extends EventEmitter {
  filename: string;
  interval: number;
  timeoutRef?;
  setTimeout: TSetTimeout;
  prev: IStats;
  start(path: string, persistent?: boolean, interval?: number): void;
  stop(): void;
}

export interface IReadStream extends Readable {
  bytesRead: number;
  path: string | Buffer;
  pending: boolean;
}

export interface IWriteStream extends Writable {
  bytesWritten: number;
  path: string;
  pending: boolean;
  close(callback?: (err?: Error) => void): void;
}

export interface IFSWatcher extends EventEmitter {
  start(path: PathLike, persistent?: boolean, recursive?: boolean, encoding?: BufferEncoding): void;
  close(): void;
}

export interface IFileHandle {
  fd: number;
  appendFile(data: TData, options?: IAppendFileOptions | string): Promise<void>;
  chmod(mode: TMode): Promise<void>;
  chown(uid: number, gid: number): Promise<void>;
  close(): Promise<void>;
  datasync(): Promise<void>;
  read(buffer: Buffer | Uint8Array, offset: number, length: number, position: number): Promise<TFileHandleReadResult>;
  readFile(options?: IReadFileOptions | string): Promise<TDataOut>;
  stat(options?: IStatOptions): Promise<IStats>;
  truncate(len?: number): Promise<void>;
  utimes(atime: TTime, mtime: TTime): Promise<void>;
  write(
    buffer: Buffer | ArrayBufferView | DataView,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<TFileHandleWriteResult>;
  writeFile(data: TData, options?: IWriteFileOptions): Promise<void>;
}

export type TFileHandle = PathLike | IFileHandle;

export interface TFileHandleReadResult {
  bytesRead: number;
  buffer: Buffer | Uint8Array;
}

export interface TFileHandleWriteResult {
  bytesWritten: number;
  buffer: Buffer | Uint8Array;
}

export type AssertCallback<T> = T extends () => void ? T : never;
