import {IFileHandle} from "../promises";
import {NodeFileSystemHandle} from "./NodeFileSystemHandle";
import {NodeFileSystemSyncAccessHandle} from "./NodeFileSystemSyncAccessHandle";

export class NodeFileSystemFileHandle extends NodeFileSystemHandle {
  constructor (name: string, protected readonly handle: IFileHandle) {
    super('file', name);
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
