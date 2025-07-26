import { Link } from './node';
import { validateCallback, promisify } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent } from './node/types/misc';
import { Error as NodeError } from './internal/errors';
import queueMicrotask from './queueMicrotask';

/**
 * A directory stream, like `fs.Dir`.
 * Implements Node.js-style directory operations with buffering and operation queuing.
 */
export class Dir implements IDir {
  // Private fields following Node.js Dir implementation pattern
  private _link: Link;
  private _options: opts.IOpendirOptions;
  private _bufferedEntries: IDirent[] = [];
  private _closed: boolean = false;
  private _operationQueue: Array<() => void> | null = null;
  private _iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];

  constructor(link: Link, options: opts.IOpendirOptions) {
    this._link = link;
    this._options = options;
    this.path = link.getParentPath();
    this._iteratorInfo.push(link.children[Symbol.iterator]());
  }

  public readonly path: string;

  private readFromIterator(iteratorInfo: IterableIterator<[string, Link | undefined]>[]): IDirent | null {
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

  private processReadResult(): void {
    // Process entries and buffer them following Node.js pattern
    const entry = this.readFromIterator(this._iteratorInfo);
    if (entry) {
      this._bufferedEntries.push(entry);
    }
  }

  private readImpl(maybeSync: boolean, callback?: (err: Error | null, dirent?: IDirent | null) => void): void {
    if (this._closed === true) {
      const error = new NodeError('ERR_DIR_CLOSED');
      if (callback) {
        callback(error as any);
        return;
      }
      throw error;
    }

    if (callback === undefined) {
      throw new Error('Callback is required');
    }

    validateCallback(callback);

    if (this._operationQueue !== null) {
      this._operationQueue.push(() => {
        this.readImpl(maybeSync, callback);
      });
      return;
    }

    if (this._bufferedEntries.length > 0) {
      const dirent = this._bufferedEntries.shift()!;
      if (maybeSync) {
        queueMicrotask(() => callback!(null, dirent));
      } else {
        callback!(null, dirent);
      }
      return;
    }

    const handleRead = () => {
      queueMicrotask(() => {
        const queue = this._operationQueue;
        this._operationQueue = null;
        if (queue) {
          for (const op of queue) op();
        }
      });

      try {
        this.processReadResult();
        const dirent = this._bufferedEntries.shift() || null;
        callback!(null, dirent);
      } catch (error) {
        callback!(error as Error);
      }
    };

    this._operationQueue = [];
    queueMicrotask(handleRead);
  }

  read(): Promise<IDirent | null>;
  read(callback?: (err: Error | null, dirent?: IDirent | null) => void): void;
  read(callback?: (err: Error | null, dirent?: IDirent | null) => void): void | Promise<IDirent | null> {
    if (typeof callback === 'function') {
      this.readImpl(true, callback);
    } else {
      if (this._closed === true) {
        return Promise.reject(new NodeError('ERR_DIR_CLOSED'));
      }
      return new Promise((resolve, reject) => {
        this.readImpl(true, (err, dirent) => {
          if (err) reject(err);
          else resolve(dirent!);
        });
      });
    }
  }

  readSync(): IDirent | null {
    if (this._closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (this._operationQueue !== null) {
      throw new NodeError('ERR_DIR_CONCURRENT_OPERATION');
    }

    if (this._bufferedEntries.length > 0) {
      return this._bufferedEntries.shift()!;
    }

    return this.readFromIterator(this._iteratorInfo);
  }

  close(): Promise<void>;
  close(callback?: (err?: Error) => void): void;
  close(callback?: (err?: Error) => void): void | Promise<void> {
    // Promise mode
    if (callback === undefined) {
      if (this._closed === true) {
        return Promise.reject(new NodeError('ERR_DIR_CLOSED'));
      }
      return new Promise((resolve, reject) => {
        this.close(err => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Callback mode
    validateCallback(callback);

    if (this._closed === true) {
      queueMicrotask(() => callback!(new NodeError('ERR_DIR_CLOSED') as any));
      return;
    }

    if (this._operationQueue !== null) {
      this._operationQueue.push(() => {
        this.close(callback);
      });
      return;
    }

    // Set the operation queue to indicate a pending operation
    this._operationQueue = [];

    queueMicrotask(() => {
      // Clear the operation queue
      const queue = this._operationQueue;
      this._operationQueue = null;

      // Close the directory
      this._closed = true;
      callback!();

      // Process any queued operations
      if (queue) {
        for (const op of queue) op();
      }
    });
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

  [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
    // Create a separate iterator info for the async iterator to avoid interference
    const iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
    iteratorInfo.push(this._link.children[Symbol.iterator]());

    const self = this;

    const iterator = {
      async next(): Promise<IteratorResult<IDirent, any>> {
        const dirent = self.readFromIterator(iteratorInfo);

        if (dirent !== null) {
          return { done: false, value: dirent };
        } else {
          return { done: true, value: undefined };
        }
      },
    };

    // Add the Symbol.asyncIterator method using bracket notation to avoid TypeScript issues
    (iterator as any)[Symbol.asyncIterator] = function () {
      return iterator;
    };

    return iterator as AsyncIterableIterator<IDirent>;
  }
}
