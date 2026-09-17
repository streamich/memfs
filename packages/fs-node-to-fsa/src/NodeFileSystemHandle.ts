import { AMODE } from '@jsonjoy.com/fs-node-utils';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor } from '@jsonjoy.com/fs-fsa';
import type { NodeFsaFs, NodeFsaContext } from './types';

/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export abstract class NodeFileSystemHandle implements IFileSystemHandle {
  protected abstract readonly fs: NodeFsaFs;
  protected abstract readonly __path: string;
  protected abstract readonly ctx: NodeFsaContext;

  constructor(
    public readonly kind: 'file' | 'directory',
    public readonly name: string,
  ) {}

  /**
   * Compares two handles to see if the associated entries (either a file or directory) match.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/isSameEntry
   */
  public isSameEntry(fileSystemHandle: IFileSystemHandle): boolean {
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
    const mode = fileSystemHandlePermissionDescriptor.mode ?? 'read';
    if (mode === 'readwrite' && this.ctx.mode === 'read') return 'denied';
    try {
      const accessMode = mode === 'readwrite' ? AMODE.R_OK | AMODE.W_OK : AMODE.R_OK;
      await this.fs.promises.access(this.__path, accessMode);
      return 'granted';
    } catch (error) {
      return 'denied';
    }
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
