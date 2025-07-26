import { Link } from './node';
import { validateCallback } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import queueMicrotask from './queueMicrotask';

// Define the asyncIterator symbol if not available
const asyncIteratorSymbol = (Symbol as any).asyncIterator || Symbol.for('Symbol.asyncIterator');

/**
 * A directory stream, like `fs.Dir`.
 */
export class Dir implements IDir {
  private _iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
  private _bufferedEntries: IDirent[] = [];
  private _operationQueue: (() => void)[] | null = null;
  private _closed = false;

  constructor(
    protected readonly _link: Link,
    protected _options: opts.IOpendirOptions,
  ) {
    this.path = _link.getParentPath();
    this._iteratorInfo.push(_link.children[Symbol.iterator]());
  }

  private promisifyMethod<T>(method: Function): (...args: any[]) => Promise<T> {
    return (...args: any[]) =>
      new Promise<T>((resolve, reject) => {
        method(...args, (error: Error | undefined | null, result?: T) => {
          if (error) reject(error);
          else resolve(result as T);
        });
      });
  }

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

  private closeBaseAsync(callback: (err?: Error) => void): void {
    validateCallback(callback);
    queueMicrotask(() => {
      if (this._closed) {
        callback(new Error('ERR_DIR_CLOSED'));
        return;
      }

      if (this._operationQueue !== null) {
        this._operationQueue.push(() => this.closeBaseAsync(callback));
        return;
      }

      try {
        this._closed = true;
        callback();
      } catch (err) {
        callback(err as Error);
      }
    });
  }

  private readBaseAsync(callback: (err: Error | null, dir?: IDirent | null) => void): void {
    validateCallback(callback);
    queueMicrotask(() => {
      if (this._closed) {
        callback(new Error('ERR_DIR_CLOSED'));
        return;
      }

      if (this._operationQueue !== null) {
        this._operationQueue.push(() => this.readBaseAsync(callback));
        return;
      }

      try {
        // Check buffered entries first
        if (this._bufferedEntries.length > 0) {
          const entry = this._bufferedEntries.shift()!;
          callback(null, entry);
          return;
        }

        // Read from iterator
        const entry = this.readFromIterator(this._iteratorInfo);
        callback(null, entry);
      } catch (err) {
        callback(err as Error);
      }
    });
  }

  // ------------------------------------------------------------- IDir

  public readonly path: string;

  close(): Promise<void>;
  close(callback?: (err?: Error) => void): void;
  close(callback?: unknown): void | Promise<void> {
    if (typeof callback === 'function') {
      this.closeBaseAsync(callback as (err?: Error) => void);
    } else {
      return this.promisifyMethod<void>(this.closeBaseAsync.bind(this))();
    }
  }

  closeSync(): void {
    if (this._closed) {
      throw new Error('ERR_DIR_CLOSED');
    }
    if (this._operationQueue !== null) {
      throw new Error('ERR_DIR_CONCURRENT_OPERATION');
    }
    this._closed = true;
  }

  read(): Promise<IDirent | null>;
  read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
  read(callback?: unknown): void | Promise<IDirent | null> {
    if (typeof callback === 'function') {
      this.readBaseAsync(callback as (err: Error | null, dir?: IDirent | null) => void);
    } else {
      return this.promisifyMethod<IDirent | null>(this.readBaseAsync.bind(this))();
    }
  }

  readSync(): IDirent | null {
    if (this._closed) {
      throw new Error('ERR_DIR_CLOSED');
    }
    if (this._operationQueue !== null) {
      throw new Error('ERR_DIR_CONCURRENT_OPERATION');
    }

    // Check buffered entries first
    if (this._bufferedEntries.length > 0) {
      return this._bufferedEntries.shift()!;
    }

    return this.readFromIterator(this._iteratorInfo);
  }

  [asyncIteratorSymbol](): AsyncIterableIterator<IDirent> {
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
    (iterator as any)[asyncIteratorSymbol] = function () {
      return iterator;
    };

    return iterator as AsyncIterableIterator<IDirent>;
  }
}
