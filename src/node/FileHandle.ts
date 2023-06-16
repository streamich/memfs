import { promisify } from './util';
import type * as opts from './types/options';
import type { IFileHandle, IStats, TData, TDataOut, TMode, TTime } from './types/misc';
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

  read(buffer: Buffer | Uint8Array, offset: number, length: number, position: number): Promise<TFileHandleReadResult> {
    return promisify(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, position);
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
