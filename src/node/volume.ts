import { resolve, sep, relative, join, dirname, normalize, posix, isAbsolute } from '../vendor/node/path';
import { FanOutUnsubscribe } from 'thingies/lib/fanout';
import { Link, Superblock } from '../core';
import Stats from './Stats';
import Dirent from './Dirent';
import StatFs from './StatFs';
import { Buffer, bufferAllocUnsafe, bufferFrom } from '../vendor/node/internal/buffer';
import queueMicrotask from '../queueMicrotask';
import setTimeoutUnref, { TSetTimeout } from '../setTimeoutUnref';
import { Readable, Writable } from '../vendor/node/stream';
import { constants } from '../constants';
import { EventEmitter } from '../vendor/node/events';
import { TEncodingExtended, TDataOut, strToEncoding, ENCODING_UTF8 } from '../encoding';
import { FileHandle } from './FileHandle';
import { inherits } from '../vendor/node/util';
import * as misc from './types/misc';
import * as opts from './types/options';
import { FsCallbackApi, WritevCallback } from './types/FsCallbackApi';
import { FsPromises } from './FsPromises';
import { ToTreeOptions, toTreeSync } from '../print';
import { ERRSTR, FLAGS, MODE } from './constants';
import * as errors from '../vendor/node/internal/errors';
import {
  getDefaultOpts,
  getDefaultOptsAndCb,
  getMkdirOptions,
  getOptions,
  getReadFileOptions,
  getReaddirOptions,
  getReaddirOptsAndCb,
  getRmOptsAndCb,
  getRmdirOptions,
  optsAndCbGenerator,
  getAppendFileOptsAndCb,
  getAppendFileOpts,
  getStatOptsAndCb,
  getStatOptions,
  getStatfsOptsAndCb,
  getStatfsOptions,
  getRealpathOptsAndCb,
  getRealpathOptions,
  getWriteFileOptions,
  writeFileDefaults,
  getOpendirOptsAndCb,
  getOpendirOptions,
} from './options';
import {
  validateCallback,
  modeToNumber,
  pathToFilename,
  nullCheck,
  createError,
  genRndStr6,
  flagsToNumber,
  getWriteArgs,
  bufferToEncoding,
  getWriteSyncArgs,
} from './util';
import type { PathLike, symlink } from './types/misc';
import type { FsPromisesApi, FsSynchronousApi } from './types';
import { Dir } from './Dir';
import { DirectoryJSON, NestedDirectoryJSON } from '../core/json';
import { ERROR_CODE } from '../core/constants';
import { TFileId } from '../core/types';
import { dataToBuffer, filenameToSteps, isFd, isWin, validateFd } from '../core/util';

const resolveCrossPlatform = resolve;
const { O_SYMLINK, F_OK, R_OK, W_OK, X_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE } = constants;

const pathSep = posix ? posix.sep : sep;
const pathRelative = posix ? posix.relative : relative;
const pathJoin = posix ? posix.join : join;
const pathDirname = posix ? posix.dirname : dirname;
const pathNormalize = posix ? posix.normalize : normalize;

// ---------------------------------------- Types

// Node-style errors with a `code` property.
export interface IError extends Error {
  code?: string;
}

export type TData = TDataOut | ArrayBufferView | DataView; // Data formats users can give us.
export type TFlags = string | number;
export type TMode = string | number; // Mode can be a String, although docs say it should be a Number.
export type TTime = number | string | Date;

// ---------------------------------------- Constants

const kMinPoolSpace = 128;

// ---------------------------------------- Flags

export type TFlagsCopy =
  | typeof constants.COPYFILE_EXCL
  | typeof constants.COPYFILE_FICLONE
  | typeof constants.COPYFILE_FICLONE_FORCE;

// ---------------------------------------- Options

// Options for `fs.appendFile` and `fs.appendFileSync`
export interface IAppendFileOptions extends opts.IFileOptions {}

// Options for `fs.watchFile`
export interface IWatchFileOptions {
  persistent?: boolean;
  interval?: number;
}

// Options for `fs.watch`
export interface IWatchOptions extends opts.IOptions {
  persistent?: boolean;
  recursive?: boolean;
}

// ---------------------------------------- Utility functions

export function pathToSteps(path: PathLike): string[] {
  return filenameToSteps(pathToFilename(path));
}

export function dataToStr(data: TData, encoding: BufferEncoding = ENCODING_UTF8): string {
  if (Buffer.isBuffer(data)) return data.toString(encoding);
  else if (data instanceof Uint8Array) return bufferFrom(data).toString(encoding);
  else return String(data);
}

// converts Date or number to a fractional UNIX timestamp
export function toUnixTimestamp(time) {
  // tslint:disable-next-line triple-equals
  if (typeof time === 'string' && +time == (time as any)) {
    return +time;
  }
  if (time instanceof Date) {
    return time.getTime() / 1000;
  }
  if (isFinite(time)) {
    if (time < 0) {
      return Date.now() / 1000;
    }
    return time;
  }
  throw new Error('Cannot parse time: ' + time);
}

function validateUid(uid: number) {
  if (typeof uid !== 'number') throw TypeError(ERRSTR.UID);
}

function validateGid(gid: number) {
  if (typeof gid !== 'number') throw TypeError(ERRSTR.GID);
}

/**
 * `Volume` represents a file system.
 */
export class Volume implements FsCallbackApi, FsSynchronousApi {
  public static readonly fromJSON = (json: DirectoryJSON, cwd?: string): Volume =>
    new Volume(Superblock.fromJSON(json, cwd));

  public static readonly fromNestedJSON = (json: NestedDirectoryJSON, cwd?: string): Volume =>
    new Volume(Superblock.fromNestedJSON(json, cwd));

  StatWatcher: new () => StatWatcher;
  ReadStream: new (...args) => misc.IReadStream;
  WriteStream: new (...args) => IWriteStream;
  FSWatcher: new () => FSWatcher;

  realpath: {
    (path: PathLike, callback: misc.TCallback<TDataOut>): void;
    (path: PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<TDataOut>): void;
    native: {
      (path: PathLike, callback: misc.TCallback<TDataOut>): void;
      (path: PathLike, options: opts.IRealpathOptions | string, callback: misc.TCallback<TDataOut>): void;
    };
  };

  realpathSync: {
    (path: PathLike, options?: opts.IRealpathOptions | string): TDataOut;
    native: (path: PathLike, options?: opts.IRealpathOptions | string) => TDataOut;
  };

  private promisesApi = new FsPromises(this, FileHandle);

  get promises(): FsPromisesApi {
    if (this.promisesApi === null) throw new Error('Promise is not supported in this environment.');
    return this.promisesApi;
  }

  constructor(public readonly _core: Superblock = new Superblock()) {
    const self = this; // tslint:disable-line no-this-assignment
    this.StatWatcher = class extends StatWatcher {
      constructor() {
        super(self);
      }
    };
    const _ReadStream: new (...args) => misc.IReadStream = FsReadStream as any;
    this.ReadStream = class extends _ReadStream {
      constructor(...args) {
        super(self, ...args);
      }
    } as any as new (...args) => misc.IReadStream;
    const _WriteStream: new (...args) => IWriteStream = FsWriteStream as any;
    this.WriteStream = class extends _WriteStream {
      constructor(...args) {
        super(self, ...args);
      }
    } as any as new (...args) => IWriteStream;
    this.FSWatcher = class extends FSWatcher {
      constructor() {
        super(self);
      }
    };
    const _realpath = (filename: string, encoding: TEncodingExtended | undefined): TDataOut => {
      const realLink = this._core.getResolvedLinkOrThrow(filename, 'realpath');
      return strToEncoding(realLink.getPath() || '/', encoding);
    };
    const realpathImpl = (
      path: PathLike,
      a: misc.TCallback<TDataOut> | opts.IRealpathOptions | string,
      b?: misc.TCallback<TDataOut>,
    ) => {
      const [opts, callback] = getRealpathOptsAndCb(a, b);
      const pathFilename = pathToFilename(path);
      self.wrapAsync(_realpath, [pathFilename, opts.encoding], callback);
    };
    const realpathSyncImpl = (path: PathLike, options?: opts.IRealpathOptions | string): TDataOut =>
      _realpath(pathToFilename(path), getRealpathOptions(options).encoding);
    this.realpath = realpathImpl as any;
    this.realpath.native = realpathImpl as any;
    this.realpathSync = realpathSyncImpl as any;
    this.realpathSync.native = realpathSyncImpl as any;
  }

  private wrapAsync<Args extends any[]>(method: (...args: Args) => void, args: Args, callback: misc.TCallback<any>) {
    validateCallback(callback);
    Promise.resolve().then(() => {
      let result;
      try {
        result = method.apply(this, args);
      } catch (err) {
        callback(err);
        return;
      }
      callback(null, result);
    });
  }

  public toTree(opts: ToTreeOptions = { separator: <'/' | '\\'>sep }): string {
    return toTreeSync(this, opts);
  }

  reset() {
    this._core.reset();
  }

  toJSON(paths?: PathLike | PathLike[], json = {}, isRelative = false, asBuffer = false): DirectoryJSON<string | null> {
    return this._core.toJSON(paths, json, isRelative, asBuffer);
  }

  fromJSON(json: DirectoryJSON, cwd?: string) {
    return this._core.fromJSON(json, cwd);
  }

  fromNestedJSON(json: NestedDirectoryJSON, cwd?: string) {
    return this._core.fromNestedJSON(json, cwd);
  }

  // Legacy interface
  mountSync(mountpoint: string, json: DirectoryJSON) {
    this._core.fromJSON(json, mountpoint);
  }

  public openSync = (path: PathLike, flags: TFlags, mode: TMode = MODE.DEFAULT): number => {
    // Validate (1) mode; (2) path; (3) flags - in that order.
    const modeNum = modeToNumber(mode);
    const fileName = pathToFilename(path);
    const flagsNum = flagsToNumber(flags);
    return this._core.open(fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK));
  };

  public open: {
    (path: PathLike, flags: TFlags, /* ... */ callback: misc.TCallback<number>): void;
    (path: PathLike, flags: TFlags, mode: TMode, callback: misc.TCallback<number>): void;
  } = (path: PathLike, flags: TFlags, a: TMode | misc.TCallback<number>, b?: misc.TCallback<number>): void => {
    let mode: TMode = a as TMode;
    let callback: misc.TCallback<number> = b as misc.TCallback<number>;
    if (typeof a === 'function') {
      mode = MODE.DEFAULT;
      callback = a;
    }
    mode = mode || MODE.DEFAULT;
    const modeNum = modeToNumber(mode);
    const fileName = pathToFilename(path);
    const flagsNum = flagsToNumber(flags);
    this.wrapAsync(this._core.open, [fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK)], callback);
  };

  public closeSync = (fd: number) => {
    this._core.close(fd);
  };

  public close = (fd: number, callback: misc.TCallback<void>) => {
    validateFd(fd);
    const file = this._core.getFileByFdOrThrow(fd, 'close');
    this.wrapAsync(this._core.close, [file.fd], callback);
  };

  public readSync = (
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
  ): number => {
    validateFd(fd);
    return this._core.read(fd, buffer, offset, length, position);
  };

  public read = (
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
    callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void,
  ) => {
    validateCallback(callback);
    if (length === 0) {
      // This `if` branch is from Node.js
      return queueMicrotask(() => {
        if (callback) callback(null, 0, buffer);
      });
    }
    Promise.resolve().then(() => {
      try {
        const bytes = this._core.read(fd, buffer, offset, length, position);
        callback(null, bytes, buffer);
      } catch (err) {
        callback(err);
      }
    });
  };

  public readv: {
    (fd: number, buffers: ArrayBufferView[], callback: misc.TCallback2<number, ArrayBufferView[]>): void;
    (
      fd: number,
      buffers: ArrayBufferView[],
      position: number | null,
      callback: misc.TCallback2<number, ArrayBufferView[]>,
    ): void;
  } = (
    fd: number,
    buffers: ArrayBufferView[],
    a: number | null | misc.TCallback2<number, ArrayBufferView[]>,
    b?: misc.TCallback2<number, ArrayBufferView[]>,
  ): void => {
    let position: number | null = a as number | null;
    let callback: misc.TCallback2<number, ArrayBufferView[]> = b as misc.TCallback2<number, ArrayBufferView[]>;
    if (typeof a === 'function') [position, callback] = [null, a];
    validateCallback(callback);
    Promise.resolve().then(() => {
      try {
        const bytes = this._core.readv(fd, buffers, position);
        callback(null, bytes, buffers);
      } catch (err) {
        callback(err);
      }
    });
  };

  public readvSync = (fd: number, buffers: ArrayBufferView[], position?: number | null): number => {
    validateFd(fd);
    return this._core.readv(fd, buffers, position ?? null);
  };

  private readonly _readfile = (id: TFileId, flagsNum: number, encoding: BufferEncoding): Buffer | string => {
    let result: Buffer | string;
    const isUserFd = typeof id === 'number';
    const userOwnsFd: boolean = isUserFd && isFd(id);
    let fd: number;
    if (userOwnsFd) fd = id as number;
    else {
      const filename = pathToFilename(id as PathLike);
      // Check if original path had trailing slash (indicates directory intent)
      const originalPath = String(id);
      const hasTrailingSlash = originalPath.length > 1 && originalPath.endsWith('/');

      const link = this._core.getResolvedLinkOrThrow(filename, 'open');
      const node = link.getNode();
      if (node.isDirectory()) throw createError(ERROR_CODE.EISDIR, 'open', link.getPath());

      // If path had trailing slash but resolved to a file, throw ENOTDIR
      if (hasTrailingSlash && node.isFile()) {
        throw createError(ERROR_CODE.ENOTDIR, 'open', originalPath);
      }

      fd = this.openSync(id as PathLike, flagsNum);
    }
    try {
      result = bufferToEncoding(this._core.getFileByFdOrThrow(fd).getBuffer(), encoding);
    } finally {
      if (!userOwnsFd) {
        this.closeSync(fd);
      }
    }
    return result;
  };

  public readFileSync = (file: TFileId, options?: opts.IReadFileOptions | string): TDataOut => {
    const opts = getReadFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    return this._readfile(file, flagsNum, opts.encoding as BufferEncoding);
  };

  public readFile: {
    (id: TFileId, callback: misc.TCallback<TDataOut>);
    (id: TFileId, options: opts.IReadFileOptions | string, callback: misc.TCallback<TDataOut>);
  } = (id: TFileId, a: misc.TCallback<TDataOut> | opts.IReadFileOptions | string, b?: misc.TCallback<TDataOut>) => {
    const [opts, callback] = optsAndCbGenerator<opts.IReadFileOptions, misc.TCallback<TDataOut>>(getReadFileOptions)(
      a,
      b,
    );
    const flagsNum = flagsToNumber(opts.flag);
    this.wrapAsync(this._readfile, [id, flagsNum, opts.encoding], callback);
  };

  private _write(fd: number, buf: Buffer, offset?: number, length?: number, position?: number | null): number {
    const file = this._core.getFileByFdOrThrow(fd, 'write');
    if (file.node.isSymlink()) {
      throw createError(ERROR_CODE.EBADF, 'write', file.link.getPath());
    }
    return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
  }

  public writeSync: {
    (
      fd: number,
      buffer: Buffer | ArrayBufferView | DataView,
      offset?: number,
      length?: number,
      position?: number | null,
    ): number;
    (fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
  } = (
    fd: number,
    a: string | Buffer | ArrayBufferView | DataView,
    b?: number,
    c?: number | BufferEncoding,
    d?: number,
  ): number => {
    const [, buf, offset, length, position] = getWriteSyncArgs(fd, a, b, c, d);
    return this._write(fd, buf, offset, length, position);
  };

  public write: {
    (fd: number, buffer: Buffer | ArrayBufferView | DataView, callback: (...args) => void);
    (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, callback: (...args) => void);
    (
      fd: number,
      buffer: Buffer | ArrayBufferView | DataView,
      offset: number,
      length: number,
      callback: (...args) => void,
    );
    (
      fd: number,
      buffer: Buffer | ArrayBufferView | DataView,
      offset: number,
      length: number,
      position: number,
      callback: (...args) => void,
    );
    (fd: number, str: string, callback: (...args) => void);
    (fd: number, str: string, position: number, callback: (...args) => void);
    (fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args) => void);
  } = (fd: number, a?, b?, c?, d?, e?) => {
    const [, asStr, buf, offset, length, position, cb] = getWriteArgs(fd, a, b, c, d, e);
    Promise.resolve().then(() => {
      try {
        const bytes = this._write(fd, buf, offset, length, position);
        if (!asStr) {
          cb(null, bytes, buf);
        } else {
          cb(null, bytes, a);
        }
      } catch (err) {
        cb(err);
      }
    });
  };

  private writevBase(fd: number, buffers: ArrayBufferView[], position: number | null): number {
    const file = this._core.getFileByFdOrThrow(fd);
    let p = position ?? undefined;
    if (p === -1) {
      p = undefined;
    }
    let bytesWritten = 0;
    for (const buffer of buffers) {
      const nodeBuf = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const bytes = file.write(nodeBuf, 0, nodeBuf.byteLength, p);
      p = undefined;
      bytesWritten += bytes;
      if (bytes < nodeBuf.byteLength) break;
    }
    return bytesWritten;
  }

  public writev: {
    (fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
    (fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
  } = (fd: number, buffers: ArrayBufferView[], a: number | null | WritevCallback, b?: WritevCallback): void => {
    let position: number | null = a as number | null;
    let callback: WritevCallback = b as WritevCallback;
    if (typeof a === 'function') [position, callback] = [null, a];
    validateCallback(callback);
    Promise.resolve().then(() => {
      try {
        const bytes = this.writevBase(fd, buffers, position);
        callback(null, bytes, buffers);
      } catch (err) {
        callback(err);
      }
    });
  };

  public writevSync = (fd: number, buffers: ArrayBufferView[], position?: number | null): number => {
    validateFd(fd);
    return this.writevBase(fd, buffers, position ?? null);
  };

  public writeFileSync = (id: TFileId, data: TData, options?: opts.IWriteFileOptions): void => {
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    this._core.writeFile(id, buf, flagsNum, modeNum);
  };

  public writeFile: {
    (id: TFileId, data: TData, callback: misc.TCallback<void>): void;
    (id: TFileId, data: TData, options: opts.IWriteFileOptions | string, callback: misc.TCallback<void>): void;
  } = (
    id: TFileId,
    data: TData,
    a: misc.TCallback<void> | opts.IWriteFileOptions | string,
    b?: misc.TCallback<void>,
  ): void => {
    let options: opts.IWriteFileOptions | string = a as opts.IWriteFileOptions;
    let callback: misc.TCallback<void> | undefined = b;
    if (typeof a === 'function') [options, callback] = [writeFileDefaults, a];
    const cb = validateCallback(callback);
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    this.wrapAsync(this._core.writeFile, [id, buf, flagsNum, modeNum], cb);
  };

  private _copyFile(src: string, dest: string, flags: number) {
    const buf = this.readFileSync(src) as Buffer;
    if (flags & COPYFILE_EXCL && this.existsSync(dest)) throw createError(ERROR_CODE.EEXIST, 'copyFile', src, dest);
    if (flags & COPYFILE_FICLONE_FORCE) throw createError(ERROR_CODE.ENOSYS, 'copyFile', src, dest);
    this._core.writeFile(dest, buf, FLAGS.w, MODE.DEFAULT);
  }

  public copyFileSync = (src: PathLike, dest: PathLike, flags?: TFlagsCopy) => {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);
    return this._copyFile(srcFilename, destFilename, (flags || 0) | 0);
  };

  public copyFile: {
    (src: PathLike, dest: PathLike, callback: misc.TCallback<void>);
    (src: PathLike, dest: PathLike, flags: TFlagsCopy, callback: misc.TCallback<void>);
  } = (src: PathLike, dest: PathLike, a, b?) => {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);
    let flags: TFlagsCopy;
    let callback: misc.TCallback<void>;
    if (typeof a === 'function') [flags, callback] = [0, a];
    else [flags, callback] = [a, b];
    validateCallback(callback);
    this.wrapAsync(this._copyFile, [srcFilename, destFilename, flags], callback);
  };

  private readonly _cp = (
    src: string,
    dest: string,
    options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean },
  ): void => {
    if (options.filter && !options.filter(src, dest)) return;
    const srcStat = options.dereference ? this.statSync(src) : this.lstatSync(src);
    let destStat: Stats | null = null;
    try {
      destStat = this.lstatSync(dest);
    } catch (err) {
      if ((err as any).code !== 'ENOENT') {
        throw err;
      }
    }
    // Check if src and dest are the same (both exist and have same inode)
    if (destStat && srcStat.ino === destStat.ino && srcStat.dev === destStat.dev)
      throw createError(ERROR_CODE.EINVAL, 'cp', src, dest);
    // Check type compatibility
    if (destStat) {
      if (srcStat.isDirectory() && !destStat.isDirectory()) throw createError(ERROR_CODE.EISDIR, 'cp', src, dest);
      if (!srcStat.isDirectory() && destStat.isDirectory()) throw createError(ERROR_CODE.ENOTDIR, 'cp', src, dest);
    }
    // Check if trying to copy directory to subdirectory of itself
    if (srcStat.isDirectory() && this.isSrcSubdir(src, dest)) throw createError(ERROR_CODE.EINVAL, 'cp', src, dest);
    ENDURE_PARENT_DIR_EXISTS: {
      const parent = pathDirname(dest);
      if (!this.existsSync(parent)) this.mkdirSync(parent, { recursive: true });
    }
    // Handle different file types
    if (srcStat.isDirectory()) {
      if (!options.recursive) throw createError(ERROR_CODE.EISDIR, 'cp', src);
      this.cpDirSync(srcStat, destStat, src, dest, options);
    } else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) {
      this.cpFileSync(srcStat, destStat, src, dest, options);
    } else if (srcStat.isSymbolicLink() && !options.dereference) {
      // Only handle as symlink if not dereferencing
      this.cpSymlinkSync(destStat, src, dest, options);
    } else {
      throw createError(ERROR_CODE.EINVAL, 'cp', src);
    }
  };

  private isSrcSubdir(src: string, dest: string): boolean {
    try {
      const normalizedSrc = pathNormalize(src.startsWith('/') ? src : '/' + src);
      const normalizedDest = pathNormalize(dest.startsWith('/') ? dest : '/' + dest);
      if (normalizedSrc === normalizedDest) return true;
      // Check if dest is under src by using relative path
      // If dest is under src, the relative path from src to dest won't start with '..'
      const relativePath = pathRelative(normalizedSrc, normalizedDest);
      // If relative path is empty or doesn't start with '..', dest is under src
      return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
    } catch (error) {
      // If path operations fail, assume it's safe (don't block the copy)
      return false;
    }
  }

  private cpFileSync(
    srcStat: Stats,
    destStat: Stats | null,
    src: string,
    dest: string,
    options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean },
  ): void {
    if (destStat) {
      if (options.errorOnExist) throw createError(ERROR_CODE.EEXIST, 'cp', dest);
      if (!options.force) return;
      this.unlinkSync(dest);
    }
    // Copy the file
    this.copyFileSync(src, dest, options.mode);
    // Preserve timestamps if requested
    if (options.preserveTimestamps) this.utimesSync(dest, srcStat.atime, srcStat.mtime);
    // Set file mode
    this.chmodSync(dest, Number(srcStat.mode));
  }

  private cpDirSync(
    srcStat: Stats,
    destStat: Stats | null,
    src: string,
    dest: string,
    options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean },
  ): void {
    if (!destStat) {
      this.mkdirSync(dest);
    }
    // Read directory contents
    const entries = this.readdirSync(src) as string[];
    for (const entry of entries) {
      const srcItem = pathJoin(src, String(entry));
      const destItem = pathJoin(dest, String(entry));
      // Apply filter to each item
      if (options.filter && !options.filter(srcItem, destItem)) {
        continue;
      }
      this._cp(srcItem, destItem, options);
    }
    // Set directory mode
    this.chmodSync(dest, Number(srcStat.mode));
  }

  private cpSymlinkSync(
    destStat: Stats | null,
    src: string,
    dest: string,
    options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean },
  ): void {
    let linkTarget = String(this.readlinkSync(src));
    if (!options.verbatimSymlinks && !isAbsolute(linkTarget))
      linkTarget = resolveCrossPlatform(pathDirname(src), linkTarget);
    if (destStat) this.unlinkSync(dest);
    this.symlinkSync(linkTarget, dest);
  }

  public linkSync = (existingPath: PathLike, newPath: PathLike) => {
    const existingPathFilename = pathToFilename(existingPath);
    const newPathFilename = pathToFilename(newPath);
    this._core.link(existingPathFilename, newPathFilename);
  };

  public link = (existingPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => {
    const existingPathFilename = pathToFilename(existingPath);
    const newPathFilename = pathToFilename(newPath);
    this.wrapAsync(this._core.link, [existingPathFilename, newPathFilename], callback);
  };

  public unlinkSync = (path: PathLike) => {
    const filename = pathToFilename(path);
    this._core.unlink(filename);
  };

  public unlink = (path: PathLike, callback: misc.TCallback<void>): void => {
    const filename = pathToFilename(path);
    this.wrapAsync(this._core.unlink, [filename], callback);
  };

  /**
   * `type` argument works only on Windows.
   * @param target
   * @param path
   * @param type
   */
  public symlinkSync = (target: PathLike, path: PathLike, type?: symlink.Type) => {
    const targetFilename = pathToFilename(target);
    const pathFilename = pathToFilename(path);
    this._core.symlink(targetFilename, pathFilename);
  };

  public symlink: {
    (target: PathLike, path: PathLike, callback: misc.TCallback<void>);
    (target: PathLike, path: PathLike, type: symlink.Type, callback: misc.TCallback<void>);
  } = (target: PathLike, path: PathLike, a: symlink.Type | misc.TCallback<void>, b?: misc.TCallback<void>) => {
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'function' ? a : b);
    const targetFilename = pathToFilename(target);
    const pathFilename = pathToFilename(path);
    this.wrapAsync(this._core.symlink, [targetFilename, pathFilename], callback);
  };

  private readonly _lstat = (
    filename: string,
    bigint = false,
    throwIfNoEntry = false,
  ): Stats<number | bigint> | undefined => {
    let link: Link;
    try {
      link = this._core.getLinkOrThrow(filename, 'lstat');
    } catch (err) {
      if (err.code === ERROR_CODE.ENOENT && !throwIfNoEntry) return undefined;
      else throw err;
    }
    return Stats.build(link.getNode(), bigint);
  };

  public lstatSync: {
    (path: PathLike): Stats<number>;
    (path: PathLike, options: { throwIfNoEntry?: true | undefined }): Stats<number>;
    (path: PathLike, options: { bigint: false; throwIfNoEntry?: true | undefined }): Stats<number>;
    (path: PathLike, options: { bigint: true; throwIfNoEntry?: true | undefined }): Stats<bigint>;
    (path: PathLike, options: { throwIfNoEntry: false }): Stats<number> | undefined;
    (path: PathLike, options: { bigint: false; throwIfNoEntry: false }): Stats<number> | undefined;
    (path: PathLike, options: { bigint: true; throwIfNoEntry: false }): Stats<bigint> | undefined;
  } = (path, options?) => {
    const { throwIfNoEntry = true, bigint = false } = getStatOptions(options);
    return this._lstat(pathToFilename(path), bigint as any, throwIfNoEntry as any) as any;
  };

  // TODO: make it prop
  lstat(path: PathLike, callback: misc.TCallback<Stats>): void;
  lstat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
  lstat(path: PathLike, a: misc.TCallback<Stats> | opts.IStatOptions, b?: misc.TCallback<Stats>): void {
    const [{ throwIfNoEntry = true, bigint = false }, callback] = getStatOptsAndCb(a, b);
    this.wrapAsync(this._lstat, [pathToFilename(path), bigint, throwIfNoEntry], callback);
  }

  // TODO: make it prop
  private _stat(filename: string): Stats<number>;
  private _stat(filename: string, bigint: false, throwIfNoEntry: true): Stats<number>;
  private _stat(filename: string, bigint: true, throwIfNoEntry: true): Stats<bigint>;
  private _stat(filename: string, bigint: true, throwIfNoEntry: false): Stats<bigint> | undefined;
  private _stat(filename: string, bigint: false, throwIfNoEntry: false): Stats<number> | undefined;
  private _stat(filename: string, bigint = false, throwIfNoEntry = true): Stats | undefined {
    let link: Link;
    try {
      link = this._core.getResolvedLinkOrThrow(filename, 'stat');
    } catch (err) {
      if (err.code === ERROR_CODE.ENOENT && !throwIfNoEntry) return undefined;
      else throw err;
    }
    return Stats.build(link.getNode(), bigint);
  }

  // TODO: make it prop
  statSync(path: PathLike): Stats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry?: true }): Stats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry: false }): Stats<number> | undefined;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry?: true }): Stats<number>;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry?: true }): Stats<bigint>;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry: false }): Stats<number> | undefined;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry: false }): Stats<bigint> | undefined;
  statSync(path: PathLike, options?: opts.IStatOptions): Stats | undefined {
    const { bigint = true, throwIfNoEntry = true } = getStatOptions(options);

    return this._stat(pathToFilename(path), bigint as any, throwIfNoEntry as any);
  }

  // TODO: make it prop
  stat(path: PathLike, callback: misc.TCallback<Stats>): void;
  stat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
  stat(path: PathLike, a: misc.TCallback<Stats> | opts.IStatOptions, b?: misc.TCallback<Stats>): void {
    const [{ bigint = false, throwIfNoEntry = true }, callback] = getStatOptsAndCb(a, b);
    this.wrapAsync(this._stat, [pathToFilename(path), bigint, throwIfNoEntry], callback);
  }

  // TODO: make it prop
  private fstatBase(fd: number): Stats<number>;
  private fstatBase(fd: number, bigint: false): Stats<number>;
  private fstatBase(fd: number, bigint: true): Stats<bigint>;
  private fstatBase(fd: number, bigint: boolean = false): Stats {
    const file = this._core.getFileByFd(fd);
    if (!file) throw createError(ERROR_CODE.EBADF, 'fstat');
    return Stats.build(file.node, bigint);
  }

  // TODO: make it prop
  fstatSync(fd: number): Stats<number>;
  fstatSync(fd: number, options: { bigint: false }): Stats<number>;
  fstatSync(fd: number, options: { bigint: true }): Stats<bigint>;
  fstatSync(fd: number, options?: opts.IFStatOptions): Stats {
    return this.fstatBase(fd, getStatOptions(options).bigint as any);
  }

  // TODO: make it prop
  fstat(fd: number, callback: misc.TCallback<Stats>): void;
  fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<Stats>): void;
  fstat(fd: number, a: misc.TCallback<Stats> | opts.IFStatOptions, b?: misc.TCallback<Stats>): void {
    const [opts, callback] = getStatOptsAndCb(a, b);
    this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
  }

  public renameSync = (oldPath: PathLike, newPath: PathLike) => {
    const oldPathFilename = pathToFilename(oldPath);
    const newPathFilename = pathToFilename(newPath);
    this._core.rename(oldPathFilename, newPathFilename);
  };

  public rename = (oldPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => {
    const oldPathFilename = pathToFilename(oldPath);
    const newPathFilename = pathToFilename(newPath);
    this.wrapAsync(this._core.rename, [oldPathFilename, newPathFilename], callback);
  };

  private _exists(filename: string): boolean {
    return !!this._stat(filename);
  }

  public existsSync = (path: PathLike): boolean => {
    try {
      return this._exists(pathToFilename(path));
    } catch (err) {
      return false;
    }
  };

  public exists = (path: PathLike, callback: (exists: boolean) => void) => {
    const filename = pathToFilename(path);
    if (typeof callback !== 'function') throw Error(ERRSTR.CB);
    Promise.resolve().then(() => {
      try {
        callback(this._exists(filename));
      } catch (err) {
        callback(false);
      }
    });
  };

  private _access(filename: string, mode: number) {
    const link = this._core.getLinkOrThrow(filename, 'access');
    const node = link.getNode();

    // F_OK (0) just checks for existence, which we already confirmed above
    if (mode === F_OK) {
      return;
    }

    // Check read permission
    if (mode & R_OK && !node.canRead()) {
      throw createError(ERROR_CODE.EACCES, 'access', filename);
    }

    // Check write permission
    if (mode & W_OK && !node.canWrite()) {
      throw createError(ERROR_CODE.EACCES, 'access', filename);
    }

    // Check execute permission
    if (mode & X_OK && !node.canExecute()) {
      throw createError(ERROR_CODE.EACCES, 'access', filename);
    }
  }

  public accessSync = (path: PathLike, mode: number = F_OK) => {
    const filename = pathToFilename(path);
    mode = mode | 0;
    this._access(filename, mode);
  };

  public access: {
    (path: PathLike, callback: misc.TCallback<void>);
    (path: PathLike, mode: number, callback: misc.TCallback<void>);
  } = (path: PathLike, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) => {
    let mode: number = F_OK;
    let callback: misc.TCallback<void>;
    if (typeof a !== 'function') [mode, callback] = [a | 0, validateCallback(b)];
    else callback = a;
    const filename = pathToFilename(path);
    this.wrapAsync(this._access, [filename, mode], callback);
  };

  public appendFileSync = (id: TFileId, data: TData, options?: IAppendFileOptions | string) => {
    const opts = getAppendFileOpts(options);
    // Force append behavior when using a supplied file descriptor.
    if (!opts.flag || isFd(id)) opts.flag = 'a';
    this.writeFileSync(id, data, opts);
  };

  public appendFile: {
    (id: TFileId, data: TData, callback: misc.TCallback<void>);
    (id: TFileId, data: TData, options: IAppendFileOptions | string, callback: misc.TCallback<void>);
  } = (id: TFileId, data: TData, a, b?) => {
    const [opts, callback] = getAppendFileOptsAndCb(a, b);
    // Force append behavior when using a supplied file descriptor.
    if (!opts.flag || isFd(id)) opts.flag = 'a';
    this.writeFile(id, data, opts, callback);
  };

  private readonly _readdir = (filename: string, options: opts.IReaddirOptions): TDataOut[] | Dirent[] => {
    const steps = filenameToSteps(filename);
    const link: Link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
    const node = link.getNode();
    if (!node.isDirectory()) throw createError(ERROR_CODE.ENOTDIR, 'scandir', filename);
    // Check we have permissions
    if (!node.canRead()) throw createError(ERROR_CODE.EACCES, 'scandir', filename);
    const list: Dirent[] = []; // output list
    for (const name of link.children.keys()) {
      const child = link.getChild(name);
      if (!child || name === '.' || name === '..') continue;
      list.push(Dirent.build(child, options.encoding));
      // recursion
      if (options.recursive && child.children.size) {
        const recurseOptions = { ...options, recursive: true, withFileTypes: true };
        const childList = this._readdir(child.getPath(), recurseOptions) as Dirent[];
        list.push(...childList);
      }
    }
    if (!isWin && options.encoding !== 'buffer')
      list.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
    if (options.withFileTypes) return list;
    let filename2 = filename;
    if (isWin) filename2 = filename2.replace(/\\/g, '/');
    return list.map(dirent => {
      if (options.recursive) {
        let fullPath = pathJoin(dirent.parentPath, dirent.name.toString());
        if (isWin) {
          fullPath = fullPath.replace(/\\/g, '/');
        }
        return fullPath.replace(filename2 + posix.sep, '');
      }
      return dirent.name;
    });
  };

  public readdirSync = (path: PathLike, options?: opts.IReaddirOptions | string): TDataOut[] | Dirent[] => {
    const opts = getReaddirOptions(options);
    const filename = pathToFilename(path);
    return this._readdir(filename, opts);
  };

  public readdir: {
    (path: PathLike, callback: misc.TCallback<TDataOut[] | Dirent[]>);
    (path: PathLike, options: opts.IReaddirOptions | string, callback: misc.TCallback<TDataOut[] | Dirent[]>);
  } = (path: PathLike, a?, b?) => {
    const [options, callback] = getReaddirOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this._readdir, [filename, options], callback);
  };

  private readonly _readlink = (filename: string, encoding: TEncodingExtended | undefined): TDataOut => {
    const link = this._core.getLinkOrThrow(filename, 'readlink');
    const node = link.getNode();
    if (!node.isSymlink()) throw createError(ERROR_CODE.EINVAL, 'readlink', filename);
    return strToEncoding(node.symlink, encoding);
  };

  public readlinkSync = (path: PathLike, options?: opts.IOptions): TDataOut => {
    const opts = getDefaultOpts(options);
    const filename = pathToFilename(path);
    return this._readlink(filename, opts.encoding);
  };

  public readlink: {
    (path: PathLike, callback: misc.TCallback<TDataOut>);
    (path: PathLike, options: opts.IOptions, callback: misc.TCallback<TDataOut>);
  } = (path: PathLike, a: misc.TCallback<TDataOut> | opts.IOptions, b?: misc.TCallback<TDataOut>) => {
    const [opts, callback] = getDefaultOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this._readlink, [filename, opts.encoding], callback);
  };

  private readonly _fsync = (fd: number): void => {
    this._core.getFileByFdOrThrow(fd, 'fsync');
  };

  public fsyncSync = (fd: number): void => {
    this._fsync(fd);
  };

  public fsync = (fd: number, callback: misc.TCallback<void>): void => {
    this.wrapAsync(this._fsync, [fd], callback);
  };

  private readonly _fdatasync = (fd: number): void => {
    this._core.getFileByFdOrThrow(fd, 'fdatasync');
  };

  public fdatasyncSync = (fd: number): void => {
    this._fdatasync(fd);
  };

  public fdatasync = (fd: number, callback: misc.TCallback<void>) => {
    this.wrapAsync(this._fdatasync, [fd], callback);
  };

  private readonly _ftruncate = (fd: number, len?: number): void => {
    const file = this._core.getFileByFdOrThrow(fd, 'ftruncate');
    file.truncate(len);
  };

  public ftruncateSync = (fd: number, len?: number): void => {
    this._ftruncate(fd, len);
  };

  public ftruncate: {
    (fd: number, callback: misc.TCallback<void>);
    (fd: number, len: number, callback: misc.TCallback<void>);
  } = (fd: number, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) => {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'number' ? b : a);
    this.wrapAsync(this._ftruncate, [fd, len], callback);
  };

  private readonly _truncate = (path: PathLike, len?: number): void => {
    const fd = this.openSync(path, 'r+');
    try {
      this.ftruncateSync(fd, len);
    } finally {
      this.closeSync(fd);
    }
  };

  /**
   * `id` should be a file descriptor or a path. `id` as file descriptor will
   * not be supported soon.
   */
  public truncateSync = (id: TFileId, len?: number): void => {
    if (isFd(id)) return this.ftruncateSync(id as number, len);
    this._truncate(id as PathLike, len);
  };

  public truncate: {
    (id: TFileId, callback: misc.TCallback<void>);
    (id: TFileId, len: number, callback: misc.TCallback<void>);
  } = (id: TFileId, a: misc.TCallback<void> | number, b?: misc.TCallback<void>) => {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'number' ? b : a);
    if (isFd(id)) return this.ftruncate(id as number, len, callback);
    this.wrapAsync(this._truncate, [id as string, len], callback);
  };

  private readonly _futimes = (fd: number, atime: number, mtime: number): void => {
    const file = this._core.getFileByFdOrThrow(fd, 'futimes');
    const node = file.node;
    node.atime = new Date(atime * 1000);
    node.mtime = new Date(mtime * 1000);
  };

  public futimesSync = (fd: number, atime: TTime, mtime: TTime): void => {
    this._futimes(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
  };

  public futimes = (fd: number, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => {
    this.wrapAsync(this._futimes, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
  };

  private readonly _utimes = (filename: string, atime: number, mtime: number, followSymlinks: boolean = true): void => {
    const core = this._core;
    const link = followSymlinks
      ? core.getResolvedLinkOrThrow(filename, 'utimes')
      : core.getLinkOrThrow(filename, 'lutimes');
    const node = link.getNode();
    node.atime = new Date(atime * 1000);
    node.mtime = new Date(mtime * 1000);
  };

  public utimesSync = (path: PathLike, atime: TTime, mtime: TTime): void => {
    this._utimes(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true);
  };

  public utimes = (path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => {
    this.wrapAsync(
      this._utimes,
      [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true],
      callback,
    );
  };

  public lutimesSync = (path: PathLike, atime: TTime, mtime: TTime): void => {
    this._utimes(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false);
  };

  public lutimes = (path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>): void => {
    this.wrapAsync(
      this._utimes,
      [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false],
      callback,
    );
  };

  public mkdirSync: {
    (path: PathLike, options: opts.IMkdirOptions & { recursive: true }): string | undefined;
    (path: PathLike, options?: TMode | (opts.IMkdirOptions & { recursive?: false })): void;
    (path: PathLike, options?: TMode | opts.IMkdirOptions): string | undefined;
  } = (path: PathLike, options?: TMode | opts.IMkdirOptions): string | undefined => {
    const opts = getMkdirOptions(options);
    const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
    if (opts.recursive) return this._core.mkdirp(filename, modeNum);
    this._core.mkdir(filename, modeNum);
  };

  public mkdir: {
    (path: PathLike, callback: misc.TCallback<void>);
    (path: PathLike, mode: TMode | (opts.IMkdirOptions & { recursive?: false }), callback: misc.TCallback<void>);
    (path: PathLike, mode: opts.IMkdirOptions & { recursive: true }, callback: misc.TCallback<string>);
    (path: PathLike, mode: TMode | opts.IMkdirOptions, callback: misc.TCallback<string>);
  } = (
    path: PathLike,
    a: misc.TCallback<void> | TMode | opts.IMkdirOptions,
    b?: misc.TCallback<string> | misc.TCallback<void>,
  ): void => {
    const opts: TMode | opts.IMkdirOptions = getMkdirOptions(a);
    const callback = validateCallback(typeof a === 'function' ? a : b!);
    const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
    if (opts.recursive) this.wrapAsync(this._core.mkdirp, [filename, modeNum], callback);
    else this.wrapAsync(this._core.mkdir, [filename, modeNum], callback);
  };

  private readonly _mkdtemp = (prefix: string, encoding?: TEncodingExtended, retry: number = 5): TDataOut => {
    const filename = prefix + genRndStr6();
    try {
      this._core.mkdir(filename, MODE.DIR);
      return strToEncoding(filename, encoding);
    } catch (err) {
      if (err.code === ERROR_CODE.EEXIST) {
        if (retry > 1) return this._mkdtemp(prefix, encoding, retry - 1);
        else throw Error('Could not create temp dir.');
      } else throw err;
    }
  };

  public mkdtempSync = (prefix: string, options?: opts.IOptions): TDataOut => {
    const { encoding } = getDefaultOpts(options);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    nullCheck(prefix);
    return this._mkdtemp(prefix, encoding);
  };

  public mkdtemp: {
    (prefix: string, callback: misc.TCallback<string>);
    (prefix: string, options: opts.IOptions, callback: misc.TCallback<string>);
  } = (prefix: string, a: misc.TCallback<string> | opts.IOptions, b?: misc.TCallback<string>) => {
    const [{ encoding }, callback] = getDefaultOptsAndCb(a, b);
    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');
    if (!nullCheck(prefix)) return;
    this.wrapAsync(this._mkdtemp, [prefix, encoding], callback);
  };

  public rmdirSync = (path: PathLike, options?: opts.IRmdirOptions) => {
    const opts = getRmdirOptions(options);
    this._core.rmdir(pathToFilename(path), opts.recursive);
  };

  public rmdir: {
    (path: PathLike, callback: misc.TCallback<void>);
    (path: PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>);
  } = (path: PathLike, a: misc.TCallback<void> | opts.IRmdirOptions, b?: misc.TCallback<void>) => {
    const opts: opts.IRmdirOptions = getRmdirOptions(a);
    const callback: misc.TCallback<void> = validateCallback(typeof a === 'function' ? a : b);
    this.wrapAsync(this._core.rmdir, [pathToFilename(path), opts.recursive], callback);
  };

  public rmSync = (path: PathLike, options?: opts.IRmOptions): void => {
    this._core.rm(pathToFilename(path), options?.force, options?.recursive);
  };

  public rm: {
    (path: PathLike, callback: misc.TCallback<void>): void;
    (path: PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void;
  } = (path: PathLike, a: misc.TCallback<void> | opts.IRmOptions, b?: misc.TCallback<void>): void => {
    const [opts, callback] = getRmOptsAndCb(a, b);
    this.wrapAsync(this._core.rm, [pathToFilename(path), opts?.force, opts?.recursive], callback);
  };

  private readonly _fchmod = (fd: number, modeNum: number): void => {
    const file = this._core.getFileByFdOrThrow(fd, 'fchmod');
    file.chmod(modeNum);
  };

  public fchmodSync = (fd: number, mode: TMode): void => {
    this._fchmod(fd, modeToNumber(mode));
  };

  public fchmod = (fd: number, mode: TMode, callback: misc.TCallback<void>): void => {
    this.wrapAsync(this._fchmod, [fd, modeToNumber(mode)], callback);
  };

  private readonly _chmod = (filename: string, modeNum: number, followSymlinks: boolean = true): void => {
    const link = followSymlinks
      ? this._core.getResolvedLinkOrThrow(filename, 'chmod')
      : this._core.getLinkOrThrow(filename, 'chmod');
    const node = link.getNode();
    node.chmod(modeNum);
  };

  public chmodSync = (path: PathLike, mode: TMode) => {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this._chmod(filename, modeNum, true);
  };

  public chmod = (path: PathLike, mode: TMode, callback: misc.TCallback<void>) => {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.wrapAsync(this._chmod, [filename, modeNum], callback);
  };

  private readonly _lchmod = (filename: string, modeNum: number): void => {
    this._chmod(filename, modeNum, false);
  };

  public lchmodSync = (path: PathLike, mode: TMode): void => {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this._lchmod(filename, modeNum);
  };

  public lchmod = (path: PathLike, mode: TMode, callback: misc.TCallback<void>): void => {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.wrapAsync(this._lchmod, [filename, modeNum], callback);
  };

  private readonly _fchown = (fd: number, uid: number, gid: number) => {
    this._core.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
  };

  public fchownSync = (fd: number, uid: number, gid: number) => {
    validateUid(uid);
    validateGid(gid);
    this._fchown(fd, uid, gid);
  };

  public fchown = (fd: number, uid: number, gid: number, callback: misc.TCallback<void>) => {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this._fchown, [fd, uid, gid], callback);
  };

  private readonly _chown = (filename: string, uid: number, gid: number) => {
    const link = this._core.getResolvedLinkOrThrow(filename, 'chown');
    const node = link.getNode();
    node.chown(uid, gid);
  };

  public chownSync = (path: PathLike, uid: number, gid: number) => {
    validateUid(uid);
    validateGid(gid);
    this._chown(pathToFilename(path), uid, gid);
  };

  public chown = (path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this._chown, [pathToFilename(path), uid, gid], callback);
  };

  private readonly _lchown = (filename: string, uid: number, gid: number) => {
    this._core.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
  };

  public lchownSync = (path: PathLike, uid: number, gid: number) => {
    validateUid(uid);
    validateGid(gid);
    this._lchown(pathToFilename(path), uid, gid);
  };

  public lchown = (path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this._lchown, [pathToFilename(path), uid, gid], callback);
  };

  private statWatchers: Record<string, StatWatcher> = {};

  watchFile(path: PathLike, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
  watchFile(path: PathLike, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
  watchFile(path: PathLike, a, b?): StatWatcher {
    const filename = pathToFilename(path);

    let options: IWatchFileOptions | null = a;
    let listener: (curr: Stats, prev: Stats) => void = b;

    if (typeof options === 'function') {
      listener = a;
      options = null;
    }

    if (typeof listener !== 'function') {
      throw Error('"watchFile()" requires a listener function');
    }

    let interval = 5007;
    let persistent = true;

    if (options && typeof options === 'object') {
      if (typeof options.interval === 'number') interval = options.interval;
      if (typeof options.persistent === 'boolean') persistent = options.persistent;
    }

    let watcher: StatWatcher = this.statWatchers[filename];

    if (!watcher) {
      watcher = new this.StatWatcher();
      watcher.start(filename, persistent, interval);
      this.statWatchers[filename] = watcher;
    }

    watcher.addListener('change', listener);
    return watcher;
  }

  unwatchFile(path: PathLike, listener?: (curr: Stats, prev: Stats) => void) {
    const filename = pathToFilename(path);
    const watcher = this.statWatchers[filename];
    if (!watcher) return;

    if (typeof listener === 'function') {
      watcher.removeListener('change', listener);
    } else {
      watcher.removeAllListeners('change');
    }

    if (watcher.listenerCount('change') === 0) {
      watcher.stop();
      delete this.statWatchers[filename];
    }
  }

  createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream {
    return new this.ReadStream(path, options);
  }

  createWriteStream(path: PathLike, options?: opts.IWriteStreamOptions | string): IWriteStream {
    return new this.WriteStream(path, options);
  }

  // watch(path: PathLike): FSWatcher;
  // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
  watch(
    path: PathLike,
    options?: IWatchOptions | string,
    listener?: (eventType: string, filename: string) => void,
  ): FSWatcher {
    const filename = pathToFilename(path);
    let givenOptions: typeof options | null = options;

    if (typeof options === 'function') {
      listener = options;
      givenOptions = null;
    }

    // tslint:disable-next-line prefer-const
    let { persistent, recursive, encoding }: IWatchOptions = getDefaultOpts(givenOptions);
    if (persistent === undefined) persistent = true;
    if (recursive === undefined) recursive = false;

    const watcher = new this.FSWatcher();
    watcher.start(filename, persistent, recursive, encoding as BufferEncoding);

    if (listener) {
      watcher.addListener('change', listener);
    }

    return watcher;
  }

  public cpSync = (src: string | URL, dest: string | URL, options?: opts.ICpOptions): void => {
    const srcFilename = pathToFilename(src as misc.PathLike);
    const destFilename = pathToFilename(dest as misc.PathLike);
    const opts_: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean } = {
      dereference: options?.dereference ?? false,
      errorOnExist: options?.errorOnExist ?? false,
      filter: options?.filter,
      force: options?.force ?? true,
      mode: options?.mode ?? 0,
      preserveTimestamps: options?.preserveTimestamps ?? false,
      recursive: options?.recursive ?? false,
      verbatimSymlinks: options?.verbatimSymlinks ?? false,
    };
    return this._cp(srcFilename, destFilename, opts_);
  };

  public cp: {
    (src: string | URL, dest: string | URL, callback: misc.TCallback<void>);
    (src: string | URL, dest: string | URL, options: opts.ICpOptions, callback: misc.TCallback<void>);
  } = (
    src: string | URL,
    dest: string | URL,
    a?: opts.ICpOptions | misc.TCallback<void>,
    b?: misc.TCallback<void>,
  ): void => {
    const srcFilename = pathToFilename(src as misc.PathLike);
    const destFilename = pathToFilename(dest as misc.PathLike);
    let options: Partial<opts.ICpOptions>;
    let callback: misc.TCallback<void>;
    if (typeof a === 'function') [options, callback] = [{}, a];
    else [options, callback] = [a || {}, b!];
    validateCallback(callback);
    const opts_: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean } = {
      dereference: options?.dereference ?? false,
      errorOnExist: options?.errorOnExist ?? false,
      filter: options?.filter,
      force: options?.force ?? true,
      mode: options?.mode ?? 0,
      preserveTimestamps: options?.preserveTimestamps ?? false,
      recursive: options?.recursive ?? false,
      verbatimSymlinks: options?.verbatimSymlinks ?? false,
    };
    this.wrapAsync(this._cp, [srcFilename, destFilename, opts_], callback);
  };

  private _statfs(filename: string): StatFs<number>;
  private _statfs(filename: string, bigint: false): StatFs<number>;
  private _statfs(filename: string, bigint: true): StatFs<bigint>;
  private _statfs(filename: string, bigint = false): StatFs {
    // Verify the path exists to match Node.js behavior
    this._core.getResolvedLinkOrThrow(filename, 'statfs');
    return StatFs.build(this._core, bigint);
  }

  statfsSync(path: PathLike): StatFs<number>;
  statfsSync(path: PathLike, options: { bigint: false }): StatFs<number>;
  statfsSync(path: PathLike, options: { bigint: true }): StatFs<bigint>;
  statfsSync(path: PathLike, options?: opts.IStafsOptions): StatFs {
    const { bigint = false } = getStatfsOptions(options);
    return this._statfs(pathToFilename(path), bigint as any);
  }

  statfs(path: PathLike, callback: misc.TCallback<StatFs>): void;
  statfs(path: PathLike, options: opts.IStafsOptions, callback: misc.TCallback<StatFs>): void;
  statfs(path: PathLike, a: misc.TCallback<StatFs> | opts.IStafsOptions, b?: misc.TCallback<StatFs>): void {
    const [{ bigint = false }, callback] = getStatfsOptsAndCb(a, b);
    this.wrapAsync(this._statfs, [pathToFilename(path), bigint], callback);
  }

  public openAsBlob = async (path: PathLike, options?: opts.IOpenAsBlobOptions): Promise<Blob> => {
    const filename = pathToFilename(path);
    let link;
    try {
      link = this._core.getResolvedLinkOrThrow(filename, 'open');
    } catch (error) {
      // Convert ENOENT to Node.js-compatible error for openAsBlob
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        const nodeError = new errors.TypeError('ERR_INVALID_ARG_VALUE');
        throw nodeError;
      }
      throw error;
    }

    const node = link.getNode();
    // Note: Node.js allows opening directories as blobs, so we don't throw EISDIR

    const buffer = node.getBuffer();
    const type = options?.type || '';

    return new Blob([buffer as BlobPart], { type });
  };

  public glob: FsCallbackApi['glob'] = (pattern: string, ...args: any[]) => {
    const [options, callback] = args.length === 1 ? [{}, args[0]] : [args[0], args[1]];
    this.wrapAsync(this._globSync, [pattern, options || {}], callback);
  };

  public globSync: FsSynchronousApi['globSync'] = (pattern: string, options: opts.IGlobOptions = {}) => {
    return this._globSync(pattern, options);
  };

  private readonly _globSync = (pattern: string, options: opts.IGlobOptions = {}): string[] => {
    const { globSync } = require('./glob');
    return globSync(this, pattern, options);
  };

  private readonly _opendir = (filename: string, options: opts.IOpendirOptions): Dir => {
    const link: Link = this._core.getResolvedLinkOrThrow(filename, 'scandir');
    const node = link.getNode();
    if (!node.isDirectory()) throw createError(ERROR_CODE.ENOTDIR, 'scandir', filename);
    return new Dir(link, options);
  };

  public opendirSync = (path: PathLike, options?: opts.IOpendirOptions | string): Dir => {
    const opts = getOpendirOptions(options);
    const filename = pathToFilename(path);
    return this._opendir(filename, opts);
  };

  public opendir: {
    (path: PathLike, callback: misc.TCallback<Dir>);
    (path: PathLike, options: opts.IOpendirOptions | string, callback: misc.TCallback<Dir>);
  } = (path: PathLike, a?, b?): void => {
    const [options, callback] = getOpendirOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this._opendir, [filename, options], callback);
  };
}

function emitStop(self) {
  self.emit('stop');
}

export class StatWatcher extends EventEmitter {
  vol: Volume;
  filename: string;
  interval: number;
  timeoutRef?;
  setTimeout: TSetTimeout;
  prev: Stats;

  constructor(vol: Volume) {
    super();
    this.vol = vol;
  }

  private loop() {
    this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
  }

  private hasChanged(stats: Stats): boolean {
    // if(!this.prev) return false;
    if (stats.mtimeMs > this.prev.mtimeMs) return true;
    if (stats.nlink !== this.prev.nlink) return true;
    return false;
  }

  private onInterval = () => {
    try {
      const stats = this.vol.statSync(this.filename);
      if (this.hasChanged(stats)) {
        this.emit('change', stats, this.prev);
        this.prev = stats;
      }
    } finally {
      this.loop();
    }
  };

  start(path: string, persistent: boolean = true, interval: number = 5007) {
    this.filename = pathToFilename(path);
    this.setTimeout = persistent
      ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global)
      : setTimeoutUnref;
    this.interval = interval;
    this.prev = this.vol.statSync(this.filename);
    this.loop();
  }

  stop() {
    clearTimeout(this.timeoutRef);
    queueMicrotask(() => {
      emitStop.call(this, this);
    });
  }
}

/* tslint:disable no-var-keyword prefer-const */
// ---------------------------------------- ReadStream

var pool;

function allocNewPool(poolSize) {
  pool = bufferAllocUnsafe(poolSize);
  pool.used = 0;
}

inherits(FsReadStream, Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
  if (!(this instanceof FsReadStream)) return new (FsReadStream as any)(vol, path, options);

  this._vol = vol;

  // a little bit bigger buffer and water marks by default
  options = Object.assign({}, getOptions(options, {}));
  if (options.highWaterMark === undefined) options.highWaterMark = 64 * 1024;

  Readable.call(this, options);

  this.path = pathToFilename(path);
  this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = undefined;
  this.bytesRead = 0;

  if (this.start !== undefined) {
    if (typeof this.start !== 'number') {
      throw new TypeError('"start" option must be a Number');
    }
    if (this.end === undefined) {
      this.end = Infinity;
    } else if (typeof this.end !== 'number') {
      throw new TypeError('"end" option must be a Number');
    }

    if (this.start > this.end) {
      throw new Error('"start" option must be <= "end" option');
    }

    this.pos = this.start;
  }

  if (typeof this.fd !== 'number') this.open();

  this.on('end', function () {
    if (this.autoClose) {
      if (this.destroy) this.destroy();
    }
  });
}

FsReadStream.prototype.open = function () {
  var self = this; // tslint:disable-line no-this-assignment
  this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
    if (er) {
      if (self.autoClose) {
        if (self.destroy) self.destroy();
      }
      self.emit('error', er);
      return;
    }

    self.fd = fd;
    self.emit('open', fd);
    // start the flow of data.
    self.read();
  });
};

FsReadStream.prototype._read = function (n) {
  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._read(n);
    });
  }

  if (this.destroyed) return;

  if (!pool || pool.length - pool.used < kMinPoolSpace) {
    // discard the old pool.
    allocNewPool(this._readableState.highWaterMark);
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  var thisPool = pool;
  var toRead = Math.min(pool.length - pool.used, n);
  var start = pool.used;

  if (this.pos !== undefined) toRead = Math.min(this.end - this.pos + 1, toRead);

  // already read everything we were supposed to read!
  // treat as EOF.
  if (toRead <= 0) return this.push(null);

  // the actual read.
  var self = this; // tslint:disable-line no-this-assignment
  this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);

  // move the pool positions, and internal position for reading.
  if (this.pos !== undefined) this.pos += toRead;
  pool.used += toRead;

  function onread(er, bytesRead) {
    if (er) {
      if (self.autoClose && self.destroy) {
        self.destroy();
      }
      self.emit('error', er);
    } else {
      var b = null;
      if (bytesRead > 0) {
        self.bytesRead += bytesRead;
        b = thisPool.slice(start, start + bytesRead);
      }

      self.push(b);
    }
  }
};

FsReadStream.prototype._destroy = function (err, cb) {
  this.close(err2 => {
    cb(err || err2);
  });
};

FsReadStream.prototype.close = function (cb) {
  if (cb) this.once('close', cb);

  if (this.closed || typeof this.fd !== 'number') {
    if (typeof this.fd !== 'number') {
      this.once('open', closeOnOpen);
      return;
    }
    return queueMicrotask(() => this.emit('close'));
  }

  // Since Node 18, there is only a getter for '.closed'.
  // The first branch mimics other setters from Readable.
  // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
  if (typeof this._readableState?.closed === 'boolean') {
    this._readableState.closed = true;
  } else {
    this.closed = true;
  }

  this._vol.close(this.fd, er => {
    if (er) this.emit('error', er);
    else this.emit('close');
  });

  this.fd = null;
};

// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen(fd) {
  this.close();
}

// ---------------------------------------- WriteStream

export interface IWriteStream extends Writable {
  bytesWritten: number;
  path: string;
  pending: boolean;
  new (path: PathLike, options: opts.IWriteStreamOptions);
  open();
  close();
}

inherits(FsWriteStream, Writable);
exports.WriteStream = FsWriteStream;
function FsWriteStream(vol, path, options) {
  if (!(this instanceof FsWriteStream)) return new (FsWriteStream as any)(vol, path, options);

  this._vol = vol;
  options = Object.assign({}, getOptions(options, {}));

  Writable.call(this, options);

  this.path = pathToFilename(path);
  this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
  this.flags = options.flags === undefined ? 'w' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
  this.pos = undefined;
  this.bytesWritten = 0;
  this.pending = true;

  if (this.start !== undefined) {
    if (typeof this.start !== 'number') {
      throw new TypeError('"start" option must be a Number');
    }
    if (this.start < 0) {
      throw new Error('"start" must be >= zero');
    }

    this.pos = this.start;
  }

  if (options.encoding) this.setDefaultEncoding(options.encoding);

  if (typeof this.fd !== 'number') this.open();

  // dispose on finish.
  this.once('finish', function () {
    if (this.autoClose) {
      this.close();
    }
  });
}

FsWriteStream.prototype.open = function () {
  this._vol.open(
    this.path,
    this.flags,
    this.mode,
    function (er, fd) {
      if (er) {
        if (this.autoClose && this.destroy) {
          this.destroy();
        }
        this.emit('error', er);
        return;
      }

      this.fd = fd;
      this.pending = false;
      this.emit('open', fd);
    }.bind(this),
  );
};

FsWriteStream.prototype._write = function (data, encoding, cb) {
  if (!(data instanceof Buffer || data instanceof Uint8Array)) return this.emit('error', new Error('Invalid data'));

  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._write(data, encoding, cb);
    });
  }

  var self = this; // tslint:disable-line no-this-assignment
  this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
    if (er) {
      if (self.autoClose && self.destroy) {
        self.destroy();
      }
      return cb(er);
    }
    self.bytesWritten += bytes;
    cb();
  });

  if (this.pos !== undefined) this.pos += data.length;
};

FsWriteStream.prototype._writev = function (data, cb) {
  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._writev(data, cb);
    });
  }

  const self = this; // tslint:disable-line no-this-assignment
  const len = data.length;
  const chunks = new Array(len);
  var size = 0;

  for (var i = 0; i < len; i++) {
    var chunk = data[i].chunk;

    chunks[i] = chunk;
    size += chunk.length;
  }

  const buf = Buffer.concat(chunks);
  this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
    if (er) {
      if (self.destroy) self.destroy();
      return cb(er);
    }
    self.bytesWritten += bytes;
    cb();
  });

  if (this.pos !== undefined) this.pos += size;
};

FsWriteStream.prototype.close = function (cb) {
  if (cb) this.once('close', cb);

  if (this.closed || typeof this.fd !== 'number') {
    if (typeof this.fd !== 'number') {
      this.once('open', closeOnOpen);
      return;
    }
    return queueMicrotask(() => this.emit('close'));
  }

  // Since Node 18, there is only a getter for '.closed'.
  // The first branch mimics other setters from Writable.
  // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
  if (typeof this._writableState?.closed === 'boolean') {
    this._writableState.closed = true;
  } else {
    this.closed = true;
  }

  this._vol.close(this.fd, er => {
    if (er) this.emit('error', er);
    else this.emit('close');
  });

  this.fd = null;
};

FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;

// There is no shutdown() for files.
FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;

// ---------------------------------------- FSWatcher

export class FSWatcher extends EventEmitter {
  _vol: Volume;
  _filename: string = '';
  _steps: string[];
  _filenameEncoded: TDataOut = '';
  // _persistent: boolean = true;
  _recursive: boolean = false;
  _encoding: BufferEncoding = ENCODING_UTF8;
  _link: Link;

  _timer; // Timer that keeps this task persistent.

  // inode -> removers
  private _listenerRemovers = new Map<number, Array<() => void>>();

  constructor(vol: Volume) {
    super();
    this._vol = vol;

    // TODO: Emit "error" messages when watching.
    // this._handle.onchange = function(status, eventType, filename) {
    //     if (status < 0) {
    //         self._handle.close();
    //         const error = !filename ?
    //             errnoException(status, 'Error watching file for changes:') :
    //             errnoException(status, `Error watching file ${filename} for changes:`);
    //         error.filename = filename;
    //         self.emit('error', error);
    //     } else {
    //         self.emit('change', eventType, filename);
    //     }
    // };
  }

  private _getName(): string {
    return this._steps[this._steps.length - 1];
  }

  private _onParentChild = (link: Link) => {
    if (link.getName() === this._getName()) {
      this._emit('rename');
    }
  };

  private _emit = (type: 'change' | 'rename') => {
    this.emit('change', type, this._filenameEncoded);
  };

  private _persist = () => {
    this._timer = setTimeout(this._persist, 1e6);
  };

  start(
    path: PathLike,
    persistent: boolean = true,
    recursive: boolean = false,
    encoding: BufferEncoding = ENCODING_UTF8,
  ) {
    this._filename = pathToFilename(path);
    this._steps = filenameToSteps(this._filename);
    this._filenameEncoded = strToEncoding(this._filename);
    // this._persistent = persistent;
    this._recursive = recursive;
    this._encoding = encoding;

    try {
      this._link = this._vol._core.getLinkOrThrow(this._filename, 'FSWatcher');
    } catch (err) {
      const error = new Error(`watch ${this._filename} ${err.code}`);
      (error as any).code = err.code;
      (error as any).errno = err.code;
      throw error;
    }

    const watchLinkNodeChanged = (link: Link) => {
      const filepath = link.getPath();
      const node = link.getNode();
      const onNodeChange = () => {
        let filename = pathRelative(this._filename, filepath);
        if (!filename) filename = this._getName();
        return this.emit('change', 'change', filename);
      };
      const unsub = node.changes.listen(([type]) => {
        if (type === 'modify') onNodeChange();
      });
      const removers = this._listenerRemovers.get(node.ino) ?? [];
      removers.push(() => unsub());
      this._listenerRemovers.set(node.ino, removers);
    };

    const watchLinkChildrenChanged = (link: Link) => {
      const node = link.getNode();

      // when a new link added
      const onLinkChildAdd = (l: Link) => {
        this.emit('change', 'rename', pathRelative(this._filename, l.getPath()));

        // 1. watch changes of the new link-node
        watchLinkNodeChanged(l);
        // 2. watch changes of the new link-node's children
        watchLinkChildrenChanged(l);
      };

      // when a new link deleted
      const onLinkChildDelete = (l: Link) => {
        // remove the listeners of the children nodes
        const removeLinkNodeListeners = (curLink: Link) => {
          const ino = curLink.getNode().ino;
          const removers = this._listenerRemovers.get(ino);
          if (removers) {
            removers.forEach(r => r());
            this._listenerRemovers.delete(ino);
          }
          for (const [name, childLink] of curLink.children.entries()) {
            if (childLink && name !== '.' && name !== '..') {
              removeLinkNodeListeners(childLink);
            }
          }
        };
        removeLinkNodeListeners(l);

        this.emit('change', 'rename', pathRelative(this._filename, l.getPath()));
      };

      // children nodes changed
      for (const [name, childLink] of link.children.entries()) {
        if (childLink && name !== '.' && name !== '..') {
          watchLinkNodeChanged(childLink);
        }
      }
      // link children add/remove
      const unsubscribeLinkChanges = link.changes.listen(([type, link]) => {
        if (type === 'child:add') onLinkChildAdd(link);
        else if (type === 'child:del') onLinkChildDelete(link);
      });

      const removers = this._listenerRemovers.get(node.ino) ?? [];
      removers.push(() => {
        unsubscribeLinkChanges();
      });

      if (recursive) {
        for (const [name, childLink] of link.children.entries()) {
          if (childLink && name !== '.' && name !== '..') {
            watchLinkChildrenChanged(childLink);
          }
        }
      }
    };
    watchLinkNodeChanged(this._link);
    watchLinkChildrenChanged(this._link);

    const parent = this._link.parent;
    if (parent) {
      // parent.on('child:delete', this._onParentChild);
      parent.changes.listen(([type, link]) => {
        if (type === 'child:del') this._onParentChild(link);
      });
    }

    if (persistent) this._persist();
  }

  protected _parentChangesUnsub: FanOutUnsubscribe;

  close() {
    clearTimeout(this._timer);
    this._listenerRemovers.forEach(removers => {
      removers.forEach(r => r());
    });
    this._listenerRemovers.clear();
    this._parentChangesUnsub?.();
  }
}
