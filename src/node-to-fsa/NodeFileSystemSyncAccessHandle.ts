import { assertCanWrite } from './util';
import { Buffer } from '../internal/buffer';
import type { FileSystemReadWriteOptions, IFileSystemSyncAccessHandle } from '../fsa/types';
import type { NodeFsaContext, NodeFsaFs } from './types';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
 */
export class NodeFileSystemSyncAccessHandle implements IFileSystemSyncAccessHandle {
  protected readonly fd: number;

  constructor(
    protected readonly fs: NodeFsaFs,
    protected readonly path: string,
    protected readonly ctx: NodeFsaContext,
  ) {
    this.fd = fs.openSync(path, 'r+');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/close
   */
  public async close(): Promise<void> {
    assertCanWrite(this.ctx.mode);
    this.fs.closeSync(this.fd);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/flush
   */
  public async flush(): Promise<void> {
    assertCanWrite(this.ctx.mode);
    this.fs.fsyncSync(this.fd);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/getSize
   */
  public async getSize(): Promise<number> {
    return this.fs.statSync(this.path).size;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read
   */
  public async read(buffer: ArrayBuffer | ArrayBufferView, options: FileSystemReadWriteOptions = {}): Promise<number> {
    const buf: Buffer | ArrayBufferView = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
    try {
      const size = this.fs.readSync(this.fd, buf, 0, buffer.byteLength, options.at ?? 0);
      return size;
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'EBADF': {
            throw new DOMException('File handle already closed.', 'InvalidStateError');
          }
        }
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/truncate
   * @param newSize The number of bytes to resize the file to.
   */
  public async truncate(newSize: number): Promise<void> {
    assertCanWrite(this.ctx.mode);
    this.fs.truncateSync(this.fd, newSize);
  }

  /**
   * Writes the content of a specified buffer to the file associated with the
   * handle, optionally at a given offset.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write
   * @param buffer
   * @param options
   */
  public async write(
    buffer: ArrayBuffer | ArrayBufferView | DataView,
    options: FileSystemReadWriteOptions = {},
  ): Promise<number> {
    assertCanWrite(this.ctx.mode);
    const buf: Buffer | ArrayBufferView = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
    try {
      return this.fs.writeSync(this.fd, buf, 0, buffer.byteLength, options.at ?? 0);
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'EBADF': {
            throw new DOMException('File handle already closed.', 'InvalidStateError');
          }
        }
      }
      throw error;
    }
  }
}
