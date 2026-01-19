import { AMODE } from '@jsonjoy.com/fs-node-utils';
import { NodePermissionStatus } from './NodePermissionStatus';
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
    fileSystemHandlePermissionDescriptor: FileSystemHandlePermissionDescriptor,
  ): Promise<NodePermissionStatus> {
    const { mode } = fileSystemHandlePermissionDescriptor;

    // Check if the requested mode is compatible with the context mode
    const requestedMode = mode;
    const contextMode = this.ctx.mode;

    // If requesting readwrite but context only allows read, deny
    if (requestedMode === 'readwrite' && contextMode === 'read') {
      return new NodePermissionStatus(requestedMode, 'denied');
    }

    try {
      // Use Node.js fs.promises.access() to check permissions asynchronously
      let accessMode = AMODE.F_OK;

      if (mode === 'read') {
        accessMode = AMODE.R_OK;
      } else if (mode === 'readwrite') {
        accessMode = AMODE.R_OK | AMODE.W_OK;
      }

      // Use asynchronous access check
      await this.fs.promises.access(this.__path, accessMode);

      return new NodePermissionStatus(mode, 'granted');
    } catch (error) {
      // If access check fails, permission is denied
      return new NodePermissionStatus(mode, 'denied');
    }
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
