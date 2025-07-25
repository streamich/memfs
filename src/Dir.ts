import { Link } from './node';
import { validateCallback, promisify } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import queueMicrotask from './queueMicrotask';

/**
 * A directory stream, like `fs.Dir`.
 */
export class Dir implements IDir {
  private iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];

  constructor(
    protected readonly link: Link,
    protected options: opts.IOpendirOptions,
  ) {
    this.path = link.getParentPath();
    this.iteratorInfo.push(link.children[Symbol.iterator]());
  }



  private closeBase(): void {}

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
      return promisify(this as any, 'closeBaseAsync')();
    }
  }

  closeSync(): void {
    this.closeBase();
  }

  readBaseAsync(callback: (err: Error | null, dir?: IDirent | null) => void): void {
    validateCallback(callback);
    queueMicrotask(() => {
      try {
        const result = this.readBase(this.iteratorInfo);
        callback(null, result);
      } catch (err) {
        callback(err);
      }
    });
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
    return this.readBase(this.iteratorInfo);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
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
      [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
        throw new Error('Not implemented');
      },
    };
  }
}
