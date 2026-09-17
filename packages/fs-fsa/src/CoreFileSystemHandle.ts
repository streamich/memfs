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
  public async queryPermission(
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor = {},
  ): Promise<PermissionState> {
    const requestedMode = fileSystemHandlePermissionDescriptor.mode ?? 'read';
    return requestedMode === 'readwrite' && this.ctx.mode === 'read' ? 'denied' : 'granted';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove
   */
  public async remove({ recursive }: { recursive?: boolean } = { recursive: false }): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * There is no prompt to show, so this resolves the same way {@link queryPermission} does.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission
   */
  public async requestPermission(
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor = {},
  ): Promise<PermissionState> {
    return this.queryPermission(fileSystemHandlePermissionDescriptor);
  }
}
