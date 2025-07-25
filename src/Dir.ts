import { Link } from './node';
import { validateCallback, promisify } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import { Error as NodeError } from './internal/errors';
import process from './process';
import queueMicrotask from './queueMicrotask';

/**
 * A directory stream, like `fs.Dir`.
 * Implements similar functionality to Node.js Dir class for in-memory filesystem
 */
export class Dir implements IDir {
  private readonly _path: string;
  private readonly _link: Link;
  private readonly _options: opts.IOpendirOptions;
  private readonly _bufferedEntries: IDirent[] = [];
  private _closed = false;
  private _operationQueue: Array<() => void> | null = null;
  private readonly _readPromisified: () => Promise<IDirent | null>;
  private readonly _closePromisified: () => Promise<void>;
  private readonly _iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];

  // Define async iterator property manually to ensure TypeScript recognizes it
  public readonly [Symbol.asyncIterator]: () => any;

  constructor(link: Link, options: opts.IOpendirOptions) {
    this._link = link;
    this._path = link.getParentPath();
    this._options = {
      bufferSize: 32,
      ...options,
    };
    this._iteratorInfo.push(link.children[Symbol.iterator]());

    // Bind promisified methods
    this._readPromisified = promisify(this as any, '_readImpl').bind(this, false);
    this._closePromisified = promisify(this as any, 'close').bind(this);

    // Define async iterator implementation
    this[Symbol.asyncIterator] = () => {
      const self = this;
      return {
        async next() {
          const result = await self._readPromisified();
          if (result === null) {
            return { done: true, value: undefined };
          } else {
            return { done: false, value: result };
          }
        },
        [Symbol.asyncIterator]() {
          return this;
        }
      };
    };
  }

  get path(): string {
    return this._path;
  }

  private _readBase(iteratorInfo: IterableIterator<[string, Link | undefined]>[]): IDirent | null {
    let done: boolean | undefined;
    let value: [string, Link | undefined];
    let name: string;
    let link: Link | undefined;
    
    do {
      do {
        ({ done, value } = iteratorInfo[iteratorInfo.length - 1].next());
        if (!done) {
          [name, link] = value;
        } else {
          break;
        }
      } while (name === '.' || name === '..');
      
      if (done) {
        iteratorInfo.pop();
        if (iteratorInfo.length === 0) {
          break;
        } else {
          done = false;
        }
      } else {
        if (this._options.recursive && link!.children.size) {
          iteratorInfo.push(link!.children[Symbol.iterator]());
        }
        return Dirent.build(link!, this._options.encoding);
      }
    } while (!done);
    
    return null;
  }

  private _processReadResult(): void {
    // For in-memory filesystem, we read one entry at a time
    // This method is a placeholder to match Node.js structure
    const entry = this._readBase(this._iteratorInfo);
    if (entry) {
      this._bufferedEntries.push(entry);
    }
  }

  read(): Promise<IDirent | null>;
  read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
  read(callback?: (err: Error | null, dir?: IDirent | null) => void): void | Promise<IDirent | null> {
    return this._readImpl(true, callback);
  }

  private _readImpl(maybeSync: boolean, callback?: (err: Error | null, dir?: IDirent | null) => void): void | Promise<IDirent | null> {
    if (this._closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (callback === undefined) {
      return this._readPromisified();
    }

    validateCallback(callback);

    if (this._operationQueue !== null) {
      this._operationQueue.push(() => {
        this._readImpl(maybeSync, callback);
      });
      return;
    }

    if (this._bufferedEntries.length > 0) {
      try {
        const dirent = this._bufferedEntries.shift()!;
        
        if (maybeSync) {
          queueMicrotask(() => callback(null, dirent));
        } else {
          callback(null, dirent);
        }
        return;
      } catch (error) {
        return callback(error as Error);
      }
    }

    // Simulate async operation for consistency with Node.js behavior
    const handleRead = () => {
      queueMicrotask(() => {
        const queue = this._operationQueue;
        this._operationQueue = null;
        if (queue) {
          for (const op of queue) op();
        }
      });

      try {
        this._processReadResult();
        const dirent = this._bufferedEntries.shift() || null;
        callback(null, dirent);
      } catch (error) {
        callback(error as Error);
      }
    };

    this._operationQueue = [];
    // Use setTimeout to simulate async I/O
    setTimeout(handleRead, 0);
  }

  readSync(): IDirent | null {
    if (this._closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (this._operationQueue !== null) {
      throw new NodeError('ERR_DIR_CONCURRENT_OPERATION');
    }

    if (this._bufferedEntries.length > 0) {
      const dirent = this._bufferedEntries.shift()!;
      return dirent;
    }

    return this._readBase(this._iteratorInfo);
  }

  close(): Promise<void>;
  close(callback?: (err?: Error) => void): void;
  close(callback?: (err?: Error) => void): void | Promise<void> {
    // Promise
    if (callback === undefined) {
      if (this._closed === true) {
        return Promise.reject(new NodeError('ERR_DIR_CLOSED'));
      }
      return this._closePromisified();
    }

    // callback
    validateCallback(callback);

    if (this._closed === true) {
      queueMicrotask(() => callback(new NodeError('ERR_DIR_CLOSED') as any));
      return;
    }

    if (this._operationQueue !== null) {
      this._operationQueue.push(() => {
        this.close(callback);
      });
      return;
    }

    this._closed = true;
    // Simulate async close operation
    queueMicrotask(() => callback());
  }

  closeSync(): void {
    if (this._closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (this._operationQueue !== null) {
      throw new NodeError('ERR_DIR_CONCURRENT_OPERATION');
    }

    this._closed = true;
  }
}
