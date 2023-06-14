import {NodePermissionStatus} from "./NodePermissionStatus";
import type {NodeFileSystemHandlePermissionDescriptor} from "./types";

/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 * 
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export abstract class NodeFileSystemHandle {
  constructor (
    public readonly kind: 'file' | 'directory',
    public readonly name: string,
  ) {}

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
   */
  public isSameEntry(fileSystemHandle: NodeFileSystemHandle): boolean {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
   */
  public queryPermission(fileSystemHandlePermissionDescriptor: NodeFileSystemHandlePermissionDescriptor): NodePermissionStatus {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
   */
  public async remove({recursive}: {recursive?: boolean} = {recursive: false}): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
   */
  public requestPermission(fileSystemHandlePermissionDescriptor: NodeFileSystemHandlePermissionDescriptor): NodePermissionStatus {
    throw new Error('Not implemented');
  }
}
