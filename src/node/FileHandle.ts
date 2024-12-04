import { promisify } from './util';
import type * as opts from './types/options';
import type { IFileHandle, IReadStream, IWriteStream, IStats, TData, TDataOut, TMode, TTime } from './types/misc';
import type { FsCallbackApi } from './types';

export class FileHandle implements IFileHandle {
  private fs: FsCallbackApi;

  fd: number;

  constructor(fs: FsCallbackApi, fd: number) {
    this.fs = fs;
    this.fd = fd;
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
    return promisify(this.fs, 'close')(this.fd);
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

  readableWebStream(options?: opts.IReadableWebStreamOptions): ReadableStream {
    return new ReadableStream({
      pull: async controller => {
        const data = await this.readFile();
        controller.enqueue(data);
        controller.close();
      },
    });
  }

  read(buffer: Buffer | Uint8Array, offset: number, length: number, position: number): Promise<TFileHandleReadResult> {
    return promisify(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, position);
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

  write(
    buffer: Buffer | Uint8Array,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<TFileHandleWriteResult> {
    return promisify(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(
      this.fd,
      buffer,
      offset,
      length,
      position,
    );
  }

  writev(buffers: ArrayBufferView[], position?: number | null | undefined): Promise<TFileHandleWritevResult> {
    return promisify(this.fs, 'writev', bytesWritten => ({ bytesWritten, buffers }))(this.fd, buffers, position);
  }

  writeFile(data: TData, options?: opts.IWriteFileOptions): Promise<void> {
    return promisify(this.fs, 'writeFile')(this.fd, data, options);
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
