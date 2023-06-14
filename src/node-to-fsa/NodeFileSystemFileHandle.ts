import { NodeFileSystemHandle } from './NodeFileSystemHandle';
import { NodeFileSystemSyncAccessHandle } from './NodeFileSystemSyncAccessHandle';
import { basename, ctx as createCtx, newNotAllowedError } from './util';
import type { NodeFsaContext, NodeFsaFs } from './types';

export class NodeFileSystemFileHandle extends NodeFileSystemHandle {
  constructor(
    protected readonly fs: NodeFsaFs,
    public readonly __path: string,
    protected readonly ctx: Partial<NodeFsaContext> = createCtx(ctx),
  ) {
    super('file', basename(__path, ctx.separator!));
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
      const data = await promises.readFile(path);
      const file = new File([data], this.name, {lastModified: stats.mtime.getTime()});
      return file;
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'EPERM':
          case 'EACCES':
            throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
   */
  public async createSyncAccessHandle(): Promise<NodeFileSystemSyncAccessHandle> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
   */
  public async createWritable(
    { keepExistingData = false }: { keepExistingData?: boolean } = { keepExistingData: false },
  ): Promise<NodeFileSystemSyncAccessHandle> {
    throw new Error('Not implemented');
  }
}
