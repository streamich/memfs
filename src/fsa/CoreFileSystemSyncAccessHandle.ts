import type { IFileSystemSyncAccessHandle, FileSystemReadWriteOptions, CoreFsaContext } from './types';
import type { Superblock } from '../core/Superblock';
import { Buffer } from '../internal/buffer';
import { ERROR_CODE } from '../core/constants';
import { newNotAllowedError } from './util';
import { FLAGS } from '../node/constants';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
 */
export class CoreFileSystemSyncAccessHandle implements IFileSystemSyncAccessHandle {
  private _fd: number | null = null;
  private _closed = false;

  constructor(
    private readonly _core: Superblock,
    private readonly _path: string,
    private readonly _ctx: CoreFsaContext,
  ) {}

  private _ensureOpen(): number {
    if (this._closed) {
      throw new DOMException('The file handle is closed.', 'InvalidStateError');
    }
    if (this._fd === null) {
      // Open file for read/write
      const flags = this._ctx.mode === 'readwrite' ? FLAGS['r+'] : FLAGS.r;
      this._fd = this._core.open(this._path, flags, 0o644);
    }
    return this._fd;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/close
   */
  public async close(): Promise<void> {
    if (this._fd !== null) {
      this._core.close(this._fd);
      this._fd = null;
    }
    this._closed = true;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/flush
   */
  public async flush(): Promise<void> {
    const fd = this._ensureOpen();
    // Core doesn't have an explicit flush method, but we can try to sync if available
    // For now, this is a no-op as the core writes are synchronous
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/getSize
   */
  public async getSize(): Promise<number> {
    try {
      const link = this._core.getResolvedLinkOrThrow(this._path);
      const node = link.getNode();
      return node.getSize();
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read
   */
  public async read(
    buffer: ArrayBuffer | ArrayBufferView,
    options: FileSystemReadWriteOptions = {},
  ): Promise<number> {
    const fd = this._ensureOpen();
    const { at: position = 0 } = options;

    const buf = Buffer.from(buffer);
    try {
      return this._core.read(fd, buf, 0, buf.length, position);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/truncate
   */
  public async truncate(newSize: number): Promise<void> {
    if (this._ctx.mode !== 'readwrite') {
      throw newNotAllowedError();
    }

    try {
      const link = this._core.getResolvedLinkOrThrow(this._path);
      const node = link.getNode();
      node.truncate(newSize);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write
   */
  public async write(
    buffer: ArrayBuffer | ArrayBufferView | DataView,
    options: FileSystemReadWriteOptions = {},
  ): Promise<number> {
    if (this._ctx.mode !== 'readwrite') {
      throw newNotAllowedError();
    }

    const fd = this._ensureOpen();
    const { at: position = 0 } = options;

    const buf = Buffer.from(buffer);
    try {
      return this._core.write(fd, buf, 0, buf.length, position);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }
}