import { ERROR_CODE, Link } from '@jsonjoy.com/fs-core';
import { join } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { invalidThis, withCode } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import { validateUint32 } from '@jsonjoy.com/fs-node-utils/lib/validators';
import * as opts from '@jsonjoy.com/fs-node-utils/lib/types/options';
import Dirent from './Dirent';
import { createError, validateCallback } from './util';
import type { TDataOut } from '@jsonjoy.com/fs-node-utils';
import type { IDir, IDirent } from '@jsonjoy.com/fs-node-utils/lib/types/misc';

type TReadCallback = (err: Error | null, dir?: IDirent | null) => void;
type TCloseCallback = (err?: Error | null) => void;

interface DirLevel {
  entries: IterableIterator<[string, Link | undefined]>;
  path: TDataOut;
}

const DEFAULT_ENCODING: opts.IOpendirOptions = { encoding: 'utf8' };

const dirClosed = (): Error => withCode(new Error('Directory handle was closed'), 'ERR_DIR_CLOSED');
const dirBusy = (): Error =>
  withCode(
    new Error('Cannot do synchronous work on directory handle with concurrent asynchronous operations'),
    'ERR_DIR_CONCURRENT_OPERATION',
  );

export class Dir implements IDir {
  private readonly levels: DirLevel[] = [];
  private readonly options: opts.IOpendirOptions;
  private readonly _path: TDataOut;
  private closed = false;
  private operationQueue: Array<() => void> | null = null;

  /**
   * @todo Node builds a Dir on a directory handle with `read(encoding, bufferSize)` and `close()`;
   *     this one walks a `Link` directly, so `new fs.Dir(someHandle, path)` cannot work. Extend
   *     `Superblock` with directory handles.
   *
   * @todo Get rid of `process` (specifically `process.nextTick`) globals in this file. Replace it
   *     by something, or DI inject the "environment" (such as `process`).
   *
   * @param path The path the directory was opened with, kept verbatim as `dir.path`.
   */
  constructor(handle: Link, path: TDataOut, options: opts.IOpendirOptions | string) {
    if (handle === null || handle === undefined)
      throw withCode(new TypeError('The "handle" argument must be specified'), 'ERR_MISSING_ARGS');
    const type = typeof options;
    const given =
      options === null || options === undefined || type === 'function'
        ? DEFAULT_ENCODING
        : type === 'string'
          ? ({ encoding: options } as opts.IOpendirOptions)
          : (options as opts.IOpendirOptions);
    const opts: opts.IOpendirOptions = { bufferSize: 32, ...given };
    validateUint32(opts.bufferSize, 'options.bufferSize', true);
    this.options = opts;
    this._path = path;
    this.levels.push({ entries: handle.children[Symbol.iterator](), path });
  }

  private readBase(): IDirent | null {
    const levels = this.levels;
    const options = this.options;
    const encoding = options.encoding;
    const recursive = options.recursive;
    while (levels.length) {
      const level = levels[levels.length - 1];
      const { done, value } = level.entries.next();
      if (done) {
        levels.pop();
        continue;
      }
      const name = value[0];
      if (name === '.' || name === '..') continue;
      const link = value[1]!;
      // TODO: Node's `parentPath` is the path as opened (a Buffer, relative, via a symlink), we use link's.
      const dirent = Dirent.build(link, encoding);
      if (recursive && dirent.isDirectory()) this.descend(level.path, dirent.name, link);
      return dirent;
    }
    return null;
  }

  // TODO: Node opens the joined path, failing ENOENT on a `hex` or non-ASCII `latin1` name, we follow the link.
  private descend(parent: TDataOut, name: TDataOut, link: Link): void {
    const path = join(parent as string, name as string);
    if (!link.getNode().canRead()) throw createError(ERROR_CODE.EACCES, 'opendir', path);
    this.levels.push({ entries: link.children[Symbol.iterator](), path });
  }

  private readPromise(): Promise<IDirent | null> {
    return new Promise<IDirent | null>((resolve, reject) => {
      this.readImpl((err, entry) => {
        if (err) reject(err);
        else resolve(entry ?? null);
      });
    });
  }

  private readImpl(callback: unknown): void | Promise<IDirent | null> {
    if (this.closed) throw dirClosed();
    if (callback === undefined) return this.readPromise();
    const cb = callback as TReadCallback;
    validateCallback(cb);
    const queued = this.operationQueue;
    if (queued !== null) {
      queued.push(() => {
        try {
          this.readImpl(cb);
        } catch (err) {
          process.nextTick(cb, err as Error);
        }
      });
      return;
    }
    this.operationQueue = [];
    let entry: IDirent | null = null;
    let error: unknown = null;
    try {
      entry = this.readBase();
    } catch (err) {
      error = err;
    }
    process.nextTick(() => {
      process.nextTick(() => {
        const queue = this.operationQueue;
        this.operationQueue = null;
        if (queue) for (let i = 0; i < queue.length; i++) queue[i]();
      });
      if (error) cb(error as Error);
      else cb(null, entry);
    });
  }

  // --------------------------------------------------------------------- IDir

  public get path(): TDataOut {
    // TODO: brand-check like Node's `#path in this`: `instanceof` lets `Object.create(Dir.prototype)` through.
    if (!(this instanceof Dir)) throw invalidThis('Dir');
    return this._path;
  }

  close(): Promise<void>;
  close(callback?: TCloseCallback): void;
  close(callback?: unknown): void | Promise<void> {
    if (callback === undefined) {
      if (this.closed) return Promise.reject(dirClosed());
      return new Promise<void>((resolve, reject) => {
        this.close((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    const cb = callback as TCloseCallback;
    validateCallback(cb);
    if (this.closed) {
      process.nextTick(cb, dirClosed());
      return;
    }
    const queued = this.operationQueue;
    if (queued !== null) {
      queued.push(() => {
        this.close(cb);
      });
      return;
    }
    this.closed = true;
    process.nextTick(cb, null);
  }

  closeSync(): void {
    if (this.closed) throw dirClosed();
    if (this.operationQueue !== null) throw dirBusy();
    this.closed = true;
  }

  read(): Promise<IDirent | null>;
  read(callback?: TReadCallback): void;
  read(callback?: unknown): void | Promise<IDirent | null> {
    if (arguments.length === 0) return this.readPromise();
    return this.readImpl(callback);
  }

  readSync(): IDirent | null {
    if (this.closed) throw dirClosed();
    if (this.operationQueue !== null) throw dirBusy();
    return this.readBase();
  }

  async *entries(): AsyncIterableIterator<IDirent> {
    try {
      while (true) {
        const entry = await this.read();
        if (entry === null) break;
        yield entry;
      }
    } finally {
      await this.close();
    }
  }

  declare [Symbol.asyncIterator]: () => AsyncIterableIterator<IDirent>;

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.closed) return;
    await this.close();
  }

  [Symbol.dispose](): void {
    if (this.closed) return;
    this.closeSync();
  }
}

Object.defineProperty(Dir.prototype, Symbol.asyncIterator, {
  enumerable: false,
  writable: true,
  configurable: true,
  value: Dir.prototype.entries,
});
