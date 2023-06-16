import type { TEncodingExtended, TFlags, TMode } from './misc';

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
  /** @deprecated */
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

export interface IReadStreamOptions {
  flags?: TFlags;
  encoding?: BufferEncoding;
  fd?: number;
  mode?: TMode;
  autoClose?: boolean;
  start?: number;
  end?: number;
}

export interface IWriteStreamOptions {
  flags?: TFlags;
  defaultEncoding?: BufferEncoding;
  fd?: number;
  mode?: TMode;
  autoClose?: boolean;
  start?: number;
}

export interface IWatchOptions extends IOptions {
  persistent?: boolean;
  recursive?: boolean;
}
