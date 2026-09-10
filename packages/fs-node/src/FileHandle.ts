import { promisify } from './util';
import {
  getHandleReadArgs,
  getHandleWriteArgs,
  type IReadOptions,
  type IReadParams,
  type IWriteOptions,
} from './readWriteArgs';
import { EventEmitter } from '@jsonjoy.com/fs-node-builtins/lib/events';
import type * as opts from '@jsonjoy.com/fs-node-utils/lib/types/options';
import type {
  IFileHandle,
  IReadStream,
  IWriteStream,
  IStats,
  TData,
  TDataOut,
  TMode,
  TTime,
} from '@jsonjoy.com/fs-node-utils/lib/types/misc';
import type { FsCallbackApi } from '@jsonjoy.com/fs-node-utils';

const assertOpen = (fd: number, syscall: string): void => {
  if (fd !== -1) return;
  const error = new Error('file closed') as Error & { code: string; syscall: string };
  error.code = 'EBADF';
  error.syscall = syscall;
  throw error;
};

export class FileHandle extends EventEmitter implements IFileHandle {
  private fs: FsCallbackApi;
  private refs: number = 1;
  private closePromise: Promise<void> | null = null;
  private closeResolve?: () => void;
  private closeReject?: (error: Error) => void;
  private readableWebStreamLocked: boolean = false;

  fd: number;

  constructor(fs: FsCallbackApi, fd: number) {
    super();
    this.fs = fs;
    this.fd = fd;
  }

  getAsyncId(): number {
    // Return a unique async ID for this file handle
    // In a real implementation, this would be provided by the underlying system
    return this.fd;
  }

  appendFile(data: TData, options?: opts.IAppendFileOptions | string): Promise<void> {
    return promisify(this.fs, 'appendFile')(this.fd, data, options);
  }

  chmod(mode: TMode): Promise<void> {
    return promisify(this.fs, 'fchmod')(this.fd, mode);
  }

  chown(uid: number, gid: number): Promise<void> {
    return promisify(this.fs, 'fchown')(this.fd, uid, gid);
  }

  close(): Promise<void> {
    if (this.fd === -1) {
      return Promise.resolve();
    }

    if (this.closePromise) {
      return this.closePromise;
    }

    this.refs--;
    if (this.refs === 0) {
      const currentFd = this.fd;
      this.fd = -1;
      this.closePromise = promisify(
        this.fs,
        'close',
      )(currentFd).finally(() => {
        this.closePromise = null;
      });
    } else {
      this.closePromise = new Promise<void>((resolve, reject) => {
        this.closeResolve = resolve;
        this.closeReject = reject;
      }).finally(() => {
        this.closePromise = null;
        this.closeReject = undefined;
        this.closeResolve = undefined;
      });
    }

    this.emit('close');
    return this.closePromise;
  }

  datasync(): Promise<void> {
    return promisify(this.fs, 'fdatasync')(this.fd);
  }

  createReadStream(options?: opts.IFileHandleReadStreamOptions): IReadStream {
    return this.fs.createReadStream('', { ...options, fd: this });
  }

  createWriteStream(options?: opts.IFileHandleWriteStreamOptions): IWriteStream {
    return this.fs.createWriteStream('', { ...options, fd: this });
  }

  readableWebStream(options: opts.IReadableWebStreamOptions = {}): ReadableStream {
    const { type = 'bytes', autoClose = false } = options;

    if (this.fd === -1) {
      throw new Error('The FileHandle is closed');
    }

    if (this.closePromise) {
      throw new Error('The FileHandle is closing');
    }

    if (this.readableWebStreamLocked) {
      throw new Error(
        'An error will be thrown if this method is called more than once or is called after the FileHandle is closed or closing.',
      );
    }

    this.readableWebStreamLocked = true;
    this.ref();

    const unlockAndCleanup = () => {
      this.readableWebStreamLocked = false;
      this.unref();
      if (autoClose) {
        this.close().catch(() => {
          // Ignore close errors in cleanup
        });
      }
    };

    return new ReadableStream({
      type: type === 'bytes' ? 'bytes' : undefined,
      autoAllocateChunkSize: 16384,

      pull: async (controller: any) => {
        try {
          const view = controller.byobRequest?.view;
          if (!view) {
            // Fallback for when BYOB is not available
            const buffer = new Uint8Array(16384);
            const result = await this.read(buffer, 0, buffer.length, null);
            if (result.bytesRead === 0) {
              controller.close();
              unlockAndCleanup();
              return;
            }
            controller.enqueue(buffer.slice(0, result.bytesRead));
            return;
          }
          // not view.byteOffset, as Node passes: the offset is into the view, so Node throws for an offset view
          const result = await this.read(view as Uint8Array, 0, view.byteLength, null);
          if (result.bytesRead === 0) {
            controller.close();
            unlockAndCleanup();
            return;
          }
          controller.byobRequest.respond(result.bytesRead);
        } catch (error) {
          controller.error(error);
          unlockAndCleanup();
        }
      },

      cancel: async () => {
        unlockAndCleanup();
      },
    });
  }

  async read(
    bufferOrParams?: Buffer | Uint8Array | ArrayBufferView | DataView | IReadParams | null,
    offsetOrOptions?: number | IReadOptions | null,
    length?: number | null,
    position?: number | bigint | null,
  ): Promise<TFileHandleReadResult> {
    assertOpen(this.fd, 'read');
    const args = getHandleReadArgs(bufferOrParams, offsetOrOptions, length, position);
    // TODO: overload like `write` once a caller reads into a non-Uint8Array view
    const buffer = args.buffer as Buffer | Uint8Array;
    if (args.length === 0) return { __proto__: null, bytesRead: args.length, buffer } as TFileHandleReadResult;
    const bytesRead = await promisify(this.fs, 'read')(this.fd, buffer, args.offset, args.length, args.position);
    return { __proto__: null, bytesRead, buffer } as TFileHandleReadResult;
  }

  async readv(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleReadvResult> {
    assertOpen(this.fd, 'readv');
    const bytesRead = await promisify(this.fs, 'readv')(this.fd, buffers, position ?? null);
    return { __proto__: null, bytesRead, buffers } as TFileHandleReadvResult;
  }

  readFile(options?: opts.IReadFileOptions | string): Promise<TDataOut> {
    return promisify(this.fs, 'readFile')(this.fd, options);
  }

  stat(options?: opts.IFStatOptions): Promise<IStats> {
    return promisify(this.fs, 'fstat')(this.fd, options);
  }

  sync(): Promise<void> {
    return promisify(this.fs, 'fsync')(this.fd);
  }

  truncate(len?: number): Promise<void> {
    return promisify(this.fs, 'ftruncate')(this.fd, len);
  }

  utimes(atime: TTime, mtime: TTime): Promise<void> {
    return promisify(this.fs, 'futimes')(this.fd, atime, mtime);
  }

  write<T extends ArrayBufferView>(
    buffer: T,
    offsetOrOptions?: number | IWriteOptions | null,
    length?: number | null,
    position?: number | null,
  ): Promise<TFileHandleWriteResult<T>>;
  write(
    data: string,
    position?: number | null,
    encoding?: BufferEncoding | null,
  ): Promise<TFileHandleWriteResult<string>>;
  async write(
    data: ArrayBufferView | string,
    offsetOrOptions?: number | IWriteOptions | null,
    lengthOrEncoding?: number | BufferEncoding | null,
    position?: number | null,
  ): Promise<TFileHandleWriteResult<ArrayBufferView | string>> {
    assertOpen(this.fd, 'write');
    const args = getHandleWriteArgs(data, offsetOrOptions, lengthOrEncoding, position);
    if (!args) return { __proto__: null, bytesWritten: 0, buffer: data } as TFileHandleWriteResult<typeof data>;
    const bytesWritten = await promisify(this.fs, 'write')(
      this.fd,
      args.buffer,
      args.offset,
      args.length,
      args.position,
    );
    return { __proto__: null, bytesWritten, buffer: data } as TFileHandleWriteResult<typeof data>;
  }

  async writev(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleWritevResult> {
    assertOpen(this.fd, 'writev');
    const bytesWritten = await promisify(this.fs, 'writev')(this.fd, buffers, position ?? null);
    return { __proto__: null, bytesWritten, buffers } as TFileHandleWritevResult;
  }

  writeFile(data: TData, options?: opts.IWriteFileOptions): Promise<void> {
    return promisify(this.fs, 'writeFile')(this.fd, data, options);
  }

  // Implement Symbol.asyncDispose if available (ES2023+)
  async [(Symbol as any).asyncDispose](): Promise<void> {
    await this.close();
  }

  private ref(): void {
    this.refs++;
  }

  private unref(): void {
    this.refs--;
    if (this.refs === 0) {
      this.fd = -1;
      if (this.closeResolve) {
        promisify(this.fs, 'close')(this.fd).then(this.closeResolve, this.closeReject);
      }
    }
  }
}

export interface TFileHandleReadResult {
  bytesRead: number;
  buffer: Buffer | Uint8Array;
}

export interface TFileHandleWriteResult<T extends ArrayBufferView | string = Buffer | Uint8Array> {
  bytesWritten: number;
  buffer: T;
}

export interface TFileHandleReadvResult {
  bytesRead: number;
  buffers: ArrayBufferView[];
}

export interface TFileHandleWritevResult {
  bytesWritten: number;
  buffers: ArrayBufferView[];
}
