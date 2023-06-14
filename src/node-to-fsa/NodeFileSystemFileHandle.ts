import {NodeFileSystemHandle} from "./NodeFileSystemHandle";
import {NodeFileSystemSyncAccessHandle} from "./NodeFileSystemSyncAccessHandle";
import {basename, ctx as createCtx} from "./util";
import type {NodeFsaContext, NodeFsaFs} from "./types";

export class NodeFileSystemFileHandle extends NodeFileSystemHandle {
  constructor (
    protected readonly fs: NodeFsaFs,
    protected readonly path: string,
    protected readonly ctx: Partial<NodeFsaContext> = createCtx(ctx),
  ) {
    super('file', basename(path, ctx.separator!));
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile
   */
  public async getFile(): Promise<File> {
    throw new Error('Not implemented');
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
  public async createWritable({keepExistingData = false}: {keepExistingData?: boolean} = {keepExistingData: false}): Promise<NodeFileSystemSyncAccessHandle> {
    throw new Error('Not implemented');
  }
}
