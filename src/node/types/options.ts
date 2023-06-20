import type { IFileHandle, TEncodingExtended, TFlags, TMode } from './misc';

export interface IOptions {
  encoding?: BufferEncoding | TEncodingExtended;
}

export interface IFileOptions extends IOptions {
  mode?: TMode;
  flag?: TFlags;
}

export interface IWriteFileOptions extends IFileOptions {}

export interface IReadFileOptions extends IOptions {
  flag?: string;
}

export interface IRealpathOptions {
  encoding?: TEncodingExtended;
}

export interface IAppendFileOptions extends IFileOptions {}

export interface IStatOptions {
  bigint?: boolean;
  throwIfNoEntry?: boolean;
}

export interface IFStatOptions {
  bigint?: boolean;
}

export interface IAppendFileOptions extends IFileOptions {}

export interface IReaddirOptions extends IOptions {
  withFileTypes?: boolean;
}

export interface IMkdirOptions {
  mode?: TMode;
  recursive?: boolean;
}

export interface IRmdirOptions {
  recursive?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface IRmOptions {
  force?: boolean;
  maxRetries?: number;
  recursive?: boolean;
  retryDelay?: number;
}

export interface IWatchFileOptions {
  persistent?: boolean;
  interval?: number;
}

export interface IReadStreamOptions extends IOptions {
  /** Defaults to `'r'`. */
  flags?: TFlags;
  /** Defaults to `null`. */
  encoding?: BufferEncoding;
  /** Defaults to `null`. */
  fd?: number | IFileHandle | null;
  /** Defaults to 0o666 */
  mode?: TMode;
  /** Defaults to `true`. */
  autoClose?: boolean;
  /** Defaults to `true`. */
  emitClose?: boolean;
  start?: number;
  /** Defaults to `Infinity`. */
  end?: number;
  /** Defaults to `64 * 1024`. */
  highWaterMark?: number;
  /** Defaults to `null`. */
  fs?: object | null;
  /** Defaults to `null`. */
  signal?: AbortSignal | null;
}

export interface IWriteStreamOptions {
  flags?: TFlags;
  encoding?: BufferEncoding;
  fd?: number | IFileHandle;
  mode?: TMode;
  autoClose?: boolean;
  emitClose?: boolean;
  start?: number;
}

export interface IWatchOptions extends IOptions {
  persistent?: boolean;
  recursive?: boolean;
}
