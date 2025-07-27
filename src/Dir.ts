import { Link } from './node';
import { validateCallback } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import * as errors from './internal/errors';

/**
 * A directory stream, like `fs.Dir`.
 */
export class Dir implements IDir {
  private iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
  private closed = false;
  private operationQueue: Array<() => void> | null = null;

  constructor(
    protected readonly link: Link,
    protected options: opts.IOpendirOptions,
  ) {
    this.path = link.getPath();
    this.iteratorInfo.push(link.children[Symbol.iterator]());
  }

  private closeBase(): void {
    // In a real filesystem implementation, this would close file descriptors
    // For memfs, we just need to mark as closed
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

  close(): Promise<void>;
  close(callback?: (err?: Error) => void): void;
  close(callback?: unknown): void | Promise<void> {
    // Promise-based close
    if (callback === undefined) {
      if (this.closed) {
        return Promise.reject(new errors.Error('ERR_DIR_CLOSED'));
      }
      return new Promise<void>((resolve, reject) => {
        this.close(err => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Callback-based close
    validateCallback(callback as (err?: Error) => void);

    if (this.closed) {
      process.nextTick(callback as (err?: Error) => void, new errors.Error('ERR_DIR_CLOSED'));
      return;
    }

    if (this.operationQueue !== null) {
      this.operationQueue.push(() => {
        this.close(callback as (err?: Error) => void);
      });
      return;
    }

    this.closed = true;
    try {
      this.closeBase();
      process.nextTick(callback as (err?: Error) => void);
    } catch (err) {
      process.nextTick(callback as (err?: Error) => void, err);
    }
  }

  closeSync(): void {
    if (this.closed) {
      throw new errors.Error('ERR_DIR_CLOSED');
    }

    if (this.operationQueue !== null) {
      throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
    }

    this.closed = true;
    this.closeBase();
  }

  read(): Promise<IDirent | null>;
  read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
  read(callback?: unknown): void | Promise<IDirent | null> {
    // Promise-based read
    if (callback === undefined) {
      return new Promise<IDirent | null>((resolve, reject) => {
        this.read((err, result) => {
          if (err) reject(err);
          else resolve(result ?? null);
        });
      });
    }

    // Callback-based read
    validateCallback(callback as (err: Error | null, dir?: IDirent | null) => void);

    if (this.closed) {
      process.nextTick(
        callback as (err: Error | null, dir?: IDirent | null) => void,
        new errors.Error('ERR_DIR_CLOSED'),
      );
      return;
    }

    if (this.operationQueue !== null) {
      this.operationQueue.push(() => {
        this.read(callback as (err: Error | null, dir?: IDirent | null) => void);
      });
      return;
    }

    this.operationQueue = [];

    try {
      const result = this.readBase(this.iteratorInfo);
      process.nextTick(() => {
        const queue = this.operationQueue;
        this.operationQueue = null;
        for (const op of queue!) op();
        (callback as (err: Error | null, dir?: IDirent | null) => void)(null, result);
      });
    } catch (err) {
      process.nextTick(() => {
        const queue = this.operationQueue;
        this.operationQueue = null;
        for (const op of queue!) op();
        (callback as (err: Error | null, dir?: IDirent | null) => void)(err);
      });
    }
  }

  readSync(): IDirent | null {
    if (this.closed) {
      throw new errors.Error('ERR_DIR_CLOSED');
    }

    if (this.operationQueue !== null) {
      throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
    }

    return this.readBase(this.iteratorInfo);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
    return {
      next: async () => {
        try {
          const dirEnt = await this.read();

          if (dirEnt !== null) {
            return { done: false, value: dirEnt };
          } else {
            return { done: true, value: undefined };
          }
        } catch (err) {
          throw err;
        }
      },
      [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
        return this;
      },
    };
  }
}
