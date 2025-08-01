import { isReadableStream, promisify, streamToBuffer } from './util';
import { constants } from '../constants';
import type * as opts from './types/options';
import type * as misc from './types/misc';
import type { FsCallbackApi, FsPromisesApi } from './types';

// AsyncIterator implementation for promises.watch
class FSWatchAsyncIterator implements AsyncIterableIterator<{ eventType: string; filename: string | Buffer }> {
  private watcher: any;
  private eventQueue: Array<{ eventType: string; filename: string | Buffer }> = [];
  private resolveQueue: Array<{ resolve: Function; reject: Function }> = [];
  private finished = false;
  private abortController?: AbortController;
  private maxQueue: number;
  private overflow: 'ignore' | 'throw';

  constructor(
    private fs: any,
    private path: misc.PathLike,
    private options: opts.IWatchOptions = {},
  ) {
    this.maxQueue = options.maxQueue || 2048;
    this.overflow = options.overflow || 'ignore';
    this.startWatching();

    // Handle AbortSignal
    if (options.signal) {
      if (options.signal.aborted) {
        this.finish();
        return;
      }
      options.signal.addEventListener('abort', () => {
        this.finish();
      });
    }
  }

  private startWatching() {
    try {
      this.watcher = this.fs.watch(this.path, this.options, (eventType: string, filename: string) => {
        this.enqueueEvent({ eventType, filename });
      });
    } catch (error) {
      // If we can't start watching, finish immediately
      this.finish();
      throw error;
    }
  }

  private enqueueEvent(event: { eventType: string; filename: string | Buffer }) {
    if (this.finished) return;

    // Handle queue overflow
    if (this.eventQueue.length >= this.maxQueue) {
      if (this.overflow === 'throw') {
        const error = new Error(`Watch queue overflow: more than ${this.maxQueue} events queued`);
        this.finish(error);
        return;
      } else {
        // 'ignore' - drop the oldest event
        this.eventQueue.shift();
        console.warn(`Watch queue overflow: dropping event due to exceeding maxQueue of ${this.maxQueue}`);
      }
    }

    this.eventQueue.push(event);

    // If there's a waiting promise, resolve it
    if (this.resolveQueue.length > 0) {
      const { resolve } = this.resolveQueue.shift()!;
      const nextEvent = this.eventQueue.shift()!;
      resolve({ value: nextEvent, done: false });
    }
  }

  private finish(error?: Error) {
    if (this.finished) return;
    this.finished = true;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Resolve or reject all pending promises
    while (this.resolveQueue.length > 0) {
      const { resolve, reject } = this.resolveQueue.shift()!;
      if (error) {
        reject(error);
      } else {
        resolve({ value: undefined, done: true });
      }
    }
  }

  async next(): Promise<IteratorResult<{ eventType: string; filename: string | Buffer }>> {
    if (this.finished) {
      return { value: undefined, done: true };
    }

    // If we have queued events, return one
    if (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      return { value: event, done: false };
    }

    // Otherwise, wait for the next event
    return new Promise((resolve, reject) => {
      this.resolveQueue.push({ resolve, reject });
    });
  }

  async return(): Promise<IteratorResult<{ eventType: string; filename: string | Buffer }>> {
    this.finish();
    return { value: undefined, done: true };
  }

  async throw(error: any): Promise<IteratorResult<{ eventType: string; filename: string | Buffer }>> {
    this.finish(error);
    throw error;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<{ eventType: string; filename: string | Buffer }> {
    return this;
  }
}

export class FsPromises implements FsPromisesApi {
  public readonly constants = constants;

  public constructor(
    protected readonly fs: FsCallbackApi,
    public readonly FileHandle: new (...args: unknown[]) => misc.IFileHandle,
  ) {}

  public readonly cp = promisify(this.fs, 'cp');
  public readonly opendir = promisify(this.fs, 'opendir');
  public readonly statfs = promisify(this.fs, 'statfs');
  public readonly lutimes = promisify(this.fs, 'lutimes');
  public readonly glob = promisify(this.fs, 'glob');
  public readonly access = promisify(this.fs, 'access');
  public readonly chmod = promisify(this.fs, 'chmod');
  public readonly chown = promisify(this.fs, 'chown');
  public readonly copyFile = promisify(this.fs, 'copyFile');
  public readonly lchmod = promisify(this.fs, 'lchmod');
  public readonly lchown = promisify(this.fs, 'lchown');
  public readonly link = promisify(this.fs, 'link');
  public readonly lstat = promisify(this.fs, 'lstat');
  public readonly mkdir = promisify(this.fs, 'mkdir');
  public readonly mkdtemp = promisify(this.fs, 'mkdtemp');
  public readonly readdir = promisify(this.fs, 'readdir');
  public readonly readlink = promisify(this.fs, 'readlink');
  public readonly realpath = promisify(this.fs, 'realpath');
  public readonly rename = promisify(this.fs, 'rename');
  public readonly rmdir = promisify(this.fs, 'rmdir');
  public readonly rm = promisify(this.fs, 'rm');
  public readonly stat = promisify(this.fs, 'stat');
  public readonly symlink = promisify(this.fs, 'symlink');
  public readonly truncate = promisify(this.fs, 'truncate');
  public readonly unlink = promisify(this.fs, 'unlink');
  public readonly utimes = promisify(this.fs, 'utimes');

  public readonly readFile = (
    id: misc.TFileHandle,
    options?: opts.IReadFileOptions | string,
  ): Promise<misc.TDataOut> => {
    return promisify(this.fs, 'readFile')(id instanceof this.FileHandle ? id.fd : (id as misc.PathLike), options);
  };

  public readonly appendFile = (
    path: misc.TFileHandle,
    data: misc.TData,
    options?: opts.IAppendFileOptions | string,
  ): Promise<void> => {
    return promisify(this.fs, 'appendFile')(
      path instanceof this.FileHandle ? path.fd : (path as misc.PathLike),
      data,
      options,
    );
  };

  public readonly open = (path: misc.PathLike, flags: misc.TFlags = 'r', mode?: misc.TMode) => {
    return promisify(this.fs, 'open', fd => new this.FileHandle(this.fs, fd))(path, flags, mode);
  };

  public readonly writeFile = (
    id: misc.TFileHandle,
    data: misc.TPromisesData,
    options?: opts.IWriteFileOptions,
  ): Promise<void> => {
    const dataPromise = isReadableStream(data) ? streamToBuffer(data) : Promise.resolve(data);
    return dataPromise.then(data =>
      promisify(this.fs, 'writeFile')(id instanceof this.FileHandle ? id.fd : (id as misc.PathLike), data, options),
    );
  };

  public readonly watch = (
    filename: misc.PathLike,
    options?: opts.IWatchOptions | string,
  ): AsyncIterableIterator<{ eventType: string; filename: string | Buffer }> => {
    const watchOptions: opts.IWatchOptions = typeof options === 'string' ? { encoding: options as any } : options || {};
    return new FSWatchAsyncIterator(this.fs, filename, watchOptions);
  };
}
