import { NodePermissionStatus } from './NodePermissionStatus';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor } from '../fsa/types';

/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export abstract class NodeFileSystemHandle implements IFileSystemHandle {
  constructor(
    public readonly kind: 'file' | 'directory',
    public readonly name: string,
  ) {}

  /**
   * Compares two handles to see if the associated entries (either a file or directory) match.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
   */
  public isSameEntry(fileSystemHandle: NodeFileSystemHandle): boolean {
    return (
      this.constructor === fileSystemHandle.constructor && (this as any).__path === (fileSystemHandle as any).__path
    );
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
   */
  public queryPermission(
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor,
  ): NodePermissionStatus {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
   */
  public async remove({ recursive }: { recursive?: boolean } = { recursive: false }): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
   */
  public requestPermission(
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor,
  ): NodePermissionStatus {
    throw new Error('Not implemented');
  }
}
