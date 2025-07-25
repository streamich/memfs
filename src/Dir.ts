import { Link } from './node';
import { validateCallback, promisify } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import { Error as NodeError } from './internal/errors';
import queueMicrotask from './queueMicrotask';

// Polyfill Symbol.asyncIterator for ES2017 compatibility
const asyncIteratorSymbol = (Symbol as any).asyncIterator || Symbol.for('Symbol.asyncIterator');

/**
 * A directory stream, like `fs.Dir`.
 * Implements Node.js-style directory operations with buffering and operation queuing.
 */
export class Dir implements IDir {
  private iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
  private bufferedEntries: IDirent[] = [];
  private closed = false;
  private operationQueue: Array<() => void> | null = null;

  constructor(
    protected readonly link: Link,
    protected options: opts.IOpendirOptions,
  ) {
    this.path = link.getParentPath();
    this.iteratorInfo.push(link.children[Symbol.iterator]());
  }



  private closeBase(): void {
    this.closed = true;
  }

  private processReadResult(): void {
    // Process entries one at a time for in-memory filesystem
    const entry = this.readBase(this.iteratorInfo);
    if (entry) {
      this.bufferedEntries.push(entry);
    }
  }

  private readBase(iteratorInfo: IterableIterator<[string, Link | undefined]>[]): IDirent | null {
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
        if (this.options.recursive && link!.children.size) {
          iteratorInfo.push(link!.children[Symbol.iterator]());
        }
        return Dirent.build(link!, this.options.encoding);
      }
    } while (!done);
    return null;
  }

  // ------------------------------------------------------------- IDir

  public readonly path: string;

  closeBaseAsync(callback: (err?: Error) => void): void {
    validateCallback(callback);

    if (this.closed === true) {
      queueMicrotask(() => callback(new NodeError('ERR_DIR_CLOSED') as any));
      return;
    }

    if (this.operationQueue !== null) {
      this.operationQueue.push(() => {
        this.closeBaseAsync(callback);
      });
      return;
    }

    queueMicrotask(() => {
      try {
        this.closeBase();
        callback();
      } catch (err) {
        callback(err);
      }
    });
  }

  close(): Promise<void>;
  close(callback?: (err?: Error) => void): void;
  close(callback?: unknown): void | Promise<void> {
    if (typeof callback === 'function') {
      this.closeBaseAsync(callback as (err?: Error) => void);
    } else {
      if (this.closed === true) {
        return Promise.reject(new NodeError('ERR_DIR_CLOSED'));
      }
      return promisify(this as any, 'closeBaseAsync')();
    }
  }

  closeSync(): void {
    if (this.closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (this.operationQueue !== null) {
      throw new NodeError('ERR_DIR_CONCURRENT_OPERATION');
    }

    this.closeBase();
  }

  readBaseAsync(callback: (err: Error | null, dir?: IDirent | null) => void): void {
    if (this.closed === true) {
      callback(new NodeError('ERR_DIR_CLOSED') as any);
      return;
    }

    validateCallback(callback);

    if (this.operationQueue !== null) {
      this.operationQueue.push(() => {
        this.readBaseAsync(callback);
      });
      return;
    }

    if (this.bufferedEntries.length > 0) {
      const dirent = this.bufferedEntries.shift()!;
      queueMicrotask(() => callback(null, dirent));
      return;
    }

    // Simulate async operation for consistency with Node.js behavior
    const handleRead = () => {
      queueMicrotask(() => {
        const queue = this.operationQueue;
        this.operationQueue = null;
        if (queue) {
          for (const op of queue) op();
        }
      });

      try {
        this.processReadResult();
        const dirent = this.bufferedEntries.shift() || null;
        callback(null, dirent);
      } catch (error) {
        callback(error as Error);
      }
    };

    this.operationQueue = [];
    queueMicrotask(handleRead);
  }

  read(): Promise<IDirent | null>;
  read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
  read(callback?: unknown): void | Promise<IDirent | null> {
    if (typeof callback === 'function') {
      this.readBaseAsync(callback as (err: Error | null, dir?: IDirent | null) => void);
    } else {
      return promisify(this as any, 'readBaseAsync')();
    }
  }

  readSync(): IDirent | null {
    if (this.closed === true) {
      throw new NodeError('ERR_DIR_CLOSED');
    }

    if (this.operationQueue !== null) {
      throw new NodeError('ERR_DIR_CONCURRENT_OPERATION');
    }

    if (this.bufferedEntries.length > 0) {
      return this.bufferedEntries.shift()!;
    }

    return this.readBase(this.iteratorInfo);
  }

  [asyncIteratorSymbol](): any {
    const iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
    iteratorInfo.push(this.link.children[Symbol.iterator]());
    // auxiliary object so promisify() can be used
    const o = {
      readBaseAsync: (callback: (err: Error | null, dir?: IDirent | null) => void): void => {
        validateCallback(callback);
        queueMicrotask(() => {
          try {
            const result = this.readBase(iteratorInfo);
            callback(null, result);
          } catch (err) {
            callback(err);
          }
        });
      },
    };
    return {
      async next() {
        const dirEnt = await promisify(o as any, 'readBaseAsync')();

        if (dirEnt !== null) {
          return { done: false, value: dirEnt };
        } else {
          return { done: true, value: undefined };
        }
      },
      [asyncIteratorSymbol](): any {
        throw new Error('Not implemented');
      },
    };
  }
}
