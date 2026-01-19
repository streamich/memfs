import { CoreFileSystemHandle } from './CoreFileSystemHandle';
import { CoreFileSystemSyncAccessHandle } from './CoreFileSystemSyncAccessHandle';
import { assertCanWrite, basename, ctx as createCtx, newNotAllowedError, newNoModificationAllowedError } from './util';
import { CoreFileSystemWritableFileStream } from './CoreFileSystemWritableFileStream';
import type {
  CoreFsaContext,
  CreateWritableOptions,
  IFileSystemFileHandle,
  IFileSystemSyncAccessHandle,
} from './types';
import type { Superblock } from '@jsonjoy.com/fs-core';
import { ERROR_CODE } from '@jsonjoy.com/fs-core';

export class CoreFileSystemFileHandle extends CoreFileSystemHandle implements IFileSystemFileHandle {
  protected readonly ctx: CoreFsaContext;

  constructor(
    protected readonly _core: Superblock,
    public readonly __path: string,
    ctx: Partial<CoreFsaContext> = {},
  ) {
    const fullCtx = createCtx(ctx);
    super('file', basename(__path, fullCtx.separator), fullCtx);
    this.ctx = fullCtx;
  }

  /**
   * Returns a {@link Promise} which resolves to a {@link File} object
   * representing the state on disk of the entry represented by the handle.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile
   */
  public async getFile(): Promise<File> {
    try {
      const path = this.__path;
      const link = this._core.getResolvedLinkOrThrow(path);
      const node = link.getNode();

      if (!node.isFile()) {
        throw new Error('Not a file');
      }

      // Get file stats for lastModified
      const lastModified = node.mtime ? node.mtime.getTime() : Date.now();

      // Read file content
      const buffer = node.getBuffer();
      const data = new Uint8Array(buffer);

      const file = new File([data], this.name, { lastModified });
      return file;
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case ERROR_CODE.EACCES:
            throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
   */
  public get createSyncAccessHandle(): undefined | (() => Promise<IFileSystemSyncAccessHandle>) {
    if (!this.ctx.syncHandleAllowed) return undefined;
    return async () => {
      if (this.ctx.locks.isLocked(this.__path)) {
        throw newNoModificationAllowedError();
      }
      return new CoreFileSystemSyncAccessHandle(this._core, this.__path, this.ctx);
    };
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
   */
  public async createWritable(
    { keepExistingData = false }: CreateWritableOptions = { keepExistingData: false },
  ): Promise<CoreFileSystemWritableFileStream> {
    assertCanWrite(this.ctx.mode);
    if (this.ctx.locks.isLocked(this.__path)) {
      throw newNoModificationAllowedError();
    }
    return new CoreFileSystemWritableFileStream(this._core, this.__path, keepExistingData, this.ctx);
  }
}
