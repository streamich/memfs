import { NodeFileSystemHandle } from './NodeFileSystemHandle';
import { NodeFileSystemSyncAccessHandle } from './NodeFileSystemSyncAccessHandle';
import { assertCanWrite, basename, ctx as createCtx, newNotAllowedError } from './util';
import { NodeFileSystemWritableFileStream } from './NodeFileSystemWritableFileStream';
import type { NodeFsaContext, NodeFsaFs } from './types';
import type { IFileSystemFileHandle, IFileSystemSyncAccessHandle } from '../fsa/types';

export class NodeFileSystemFileHandle extends NodeFileSystemHandle implements IFileSystemFileHandle {
  protected readonly ctx: NodeFsaContext;

  constructor(
    protected readonly fs: NodeFsaFs,
    public readonly __path: string,
    ctx: Partial<NodeFsaContext> = {},
  ) {
    ctx = createCtx(ctx);
    super('file', basename(__path, ctx.separator!));
    this.ctx = ctx as NodeFsaContext;
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
      const promises = this.fs.promises;
      const stats = await promises.stat(path);
      // TODO: Once implemented, use promises.readAsBlob() instead of promises.readFile().
      const data = await promises.readFile(path);
      const file = new File([data], this.name, { lastModified: stats.mtime.getTime() });
      return file;
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'EPERM':
          case 'EACCES':
            throw newNotAllowedError(this.__path);
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
    return async () => new NodeFileSystemSyncAccessHandle(this.fs, this.__path, this.ctx);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
   */
  public async createWritable(
    { keepExistingData = false }: CreateWritableOptions = { keepExistingData: false },
  ): Promise<NodeFileSystemWritableFileStream> {
    assertCanWrite(this.ctx.mode);
    return new NodeFileSystemWritableFileStream(this.fs, this.__path, keepExistingData);
  }
}

export interface CreateWritableOptions {
  keepExistingData?: boolean;
}
