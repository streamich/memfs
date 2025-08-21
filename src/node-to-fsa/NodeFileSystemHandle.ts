import { NodePermissionStatus } from './NodePermissionStatus';
import { AMODE } from '../consts/AMODE';
import type { IFileSystemHandle, FileSystemHandlePermissionDescriptor } from '../fsa/types';
import type { NodeFsaFs } from './types';

/**
 * Represents a File System Access API file handle `FileSystemHandle` object,
 * which was created from a Node.js `fs` module.
 *
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle)
 */
export abstract class NodeFileSystemHandle implements IFileSystemHandle {
  protected abstract readonly fs: NodeFsaFs;
  protected abstract readonly __path: string;

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
    const { mode } = fileSystemHandlePermissionDescriptor;
    
    try {
      // Use Node.js fs.access() to check permissions synchronously
      let accessMode = AMODE.F_OK;
      
      if (mode === 'read') {
        accessMode = AMODE.R_OK;
      } else if (mode === 'readwrite') {
        accessMode = AMODE.R_OK | AMODE.W_OK;
      }
      
      // Use synchronous access check
      this.fs.accessSync(this.__path, accessMode);
      
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
