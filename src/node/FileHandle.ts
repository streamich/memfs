import { promisify } from './util';
import { EventEmitter } from 'events';
import type * as opts from './types/options';
import type { IFileHandle, IReadStream, IWriteStream, IStats, TData, TDataOut, TMode, TTime } from './types/misc';
import type { FsCallbackApi } from './types';

export class FileHandle extends EventEmitter implements IFileHandle {
  private fs: FsCallbackApi;
  private refs: number = 1;
  private closePromise: Promise<void> | null = null;
  private closeResolve?: () => void;
  private closeReject?: (error: Error) => void;
  private position: number = 0;

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

  createReadStream(options: opts.IFileHandleReadStreamOptions): IReadStream {
    return this.fs.createReadStream('', { ...options, fd: this });
  }

  createWriteStream(options: opts.IFileHandleWriteStreamOptions): IWriteStream {
    return this.fs.createWriteStream('', { ...options, fd: this });
  }

  readableWebStream(options: opts.IReadableWebStreamOptions = {}): ReadableStream {
    const { type = 'bytes' } = options;
    let position = 0;
    let locked = false;

    if (this.fd === -1) {
      throw new Error('The FileHandle is closed');
    }

    if (this.closePromise) {
      throw new Error('The FileHandle is closing');
    }

    if (locked) {
      throw new Error('The FileHandle is locked');
    }

    locked = true;
    this.ref();

    return new ReadableStream({
      type: 'bytes',
      autoAllocateChunkSize: 16384,

      pull: async controller => {
        try {
          const view = controller.byobRequest?.view;
          if (!view) {
            // Fallback for when BYOB is not available
            const buffer = new Uint8Array(16384);
            const result = await this.read(buffer, 0, buffer.length, position);

            if (result.bytesRead === 0) {
              controller.close();
              this.unref();
              return;
            }

            position += result.bytesRead;
            controller.enqueue(buffer.slice(0, result.bytesRead));
            return;
          }

          const result = await this.read(view as Uint8Array, view.byteOffset, view.byteLength, position);

          if (result.bytesRead === 0) {
            controller.close();
            this.unref();
            return;
          }

          position += result.bytesRead;
          controller.byobRequest.respond(result.bytesRead);
        } catch (error) {
          controller.error(error);
          this.unref();
        }
      },

      cancel: async () => {
        this.unref();
      },
    });
  }

  async read(
    buffer: Buffer | Uint8Array,
    offset: number,
    length: number,
    position?: number | null,
  ): Promise<TFileHandleReadResult> {
    const readPosition = position !== null && position !== undefined ? position : this.position;

    const result = await promisify(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(
      this.fd,
      buffer,
      offset,
      length,
      readPosition,
    );

    // Update internal position only if position was null/undefined
    if (position === null || position === undefined) {
      this.position += result.bytesRead;
    }

    return result;
  }

  readv(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleReadvResult> {
    return promisify(this.fs, 'readv', bytesRead => ({ bytesRead, buffers }))(this.fd, buffers, position);
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

  async write(
    buffer: Buffer | Uint8Array,
    offset?: number,
    length?: number,
    position?: number | null,
  ): Promise<TFileHandleWriteResult> {
    const writePosition = position !== null && position !== undefined ? position : this.position;

    const result = await promisify(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(
      this.fd,
      buffer,
      offset,
      length,
      writePosition,
    );

    // Update internal position only if position was null/undefined
    if (position === null || position === undefined) {
      this.position += result.bytesWritten;
    }

    return result;
  }

  writev(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleWritevResult> {
    return promisify(this.fs, 'writev', bytesWritten => ({ bytesWritten, buffers }))(this.fd, buffers, position);
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

export interface TFileHandleWriteResult {
  bytesWritten: number;
  buffer: Buffer | Uint8Array;
}

export interface TFileHandleReadvResult {
  bytesRead: number;
  buffers: ArrayBufferView[];
}

export interface TFileHandleWritevResult {
  bytesWritten: number;
  buffers: ArrayBufferView[];
}
