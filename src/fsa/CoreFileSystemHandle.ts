import { CorePermissionStatus } from './CorePermissionStatus';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor, CoreFsaContext } from './types';

/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a core `Superblock`.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export abstract class CoreFileSystemHandle implements IFileSystemHandle {
  protected readonly ctx: CoreFsaContext;

  constructor(
    public readonly kind: 'file' | 'directory',
    public readonly name: string,
    ctx: CoreFsaContext,
  ) {
    this.ctx = ctx;
  }

  /**
   * Compares two handles to see if the associated entries (either a file or directory) match.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
   */
  public isSameEntry(fileSystemHandle: CoreFileSystemHandle): boolean {
    return (
      this.constructor === fileSystemHandle.constructor && (this as any).__path === (fileSystemHandle as any).__path
    );
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
   */
  public queryPermission(
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor,
  ): CorePermissionStatus {
    // Check if the requested mode is compatible with the context mode
    const requestedMode = fileSystemHandlePermissionDescriptor.mode;
    const contextMode = this.ctx.mode;

    // If requesting readwrite but context only allows read, deny
    if (requestedMode === 'readwrite' && contextMode === 'read') {
      return new CorePermissionStatus('denied', requestedMode);
    }

    // Otherwise grant the permission
    return new CorePermissionStatus('granted', requestedMode);
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
  ): CorePermissionStatus {
    throw new Error('Not implemented');
  }
}
