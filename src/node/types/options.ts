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
  recursive?: boolean;
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
  /**
   * Indicates whether the process should continue to run as long as files are
   * being watched. Default: true.
   */
  persistent?: boolean;

  /**
   * Indicates whether all subdirectories should be watched, or only the current
   * directory. This applies when a directory is specified, and only on
   * supported platforms (See caveats). Default: false.
   */
  recursive?: boolean;

  /**
   * Allows closing the watcher with an {@link AbortSignal}.
   */
  signal?: AbortSignal;
}

export interface ICpOptions {
  /** dereference symlinks. Default: false. */
  dereference?: boolean;

  /**
   * When force is false, and the destination exists, throw an error.
   * Default: false.
   */
  errorOnExist?: boolean;

  /**
   * Function to filter copied files/directories. Return true to copy the item,
   * false to ignore it. Default: undefined.
   */
  filter?: (src: string, dest: string) => boolean;

  /**
   * Overwrite existing file or directory. The copy operation will ignore errors
   * if you set this to false and the destination exists. Use the errorOnExist
   * option to change this behavior. Default: true.
   */
  force?: boolean;

  /**
   * Integer, modifiers for copy operation. Default: 0. See mode flag of
   * `fs.copyFileSync()`.
   */
  mode: number;

  /** When true timestamps from src will be preserved. Default: false. */
  preserveTimestamps: boolean;

  /** Copy directories recursively Default: false. */
  recursive: boolean;

  /** When true, path resolution for symlinks will be skipped. Default: false. */
  verbatimSymlinks: boolean;
}

export interface IStafsOptions {
  /** Whether the numeric values in the returned `StatFs` object should be bigint. */
  bigint?: boolean;
}

export interface IOpenAsBlobOptions {
  /** An optional mime type for the blob. */
  type?: string;
}

export interface IOpendirOptions extends IOptions {
  /**
   * Number of directory entries that are buffered internally when reading from
   * the directory. Higher values lead to better performance but higher memory
   * usage. Default: 32.
   */
  bufferSize?: number;
  /** Default: false. */
  recursive?: boolean;
}
