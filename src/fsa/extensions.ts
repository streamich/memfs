import type { IFileSystemDirectoryHandle, IFileSystemHandle } from './types';

/**
 * Extensions to browser interfaces for File System API support.
 * These are stub implementations that throw "not implemented" errors.
 */

/**
 * Extension to StorageManager interface for Origin Private File System (OPFS).
 * This method provides access to the origin's private file system.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/getDirectory
 */
export interface IStorageManagerExtension {
  /**
   * Returns a Promise that resolves to a FileSystemDirectoryHandle object
   * representing the root of the origin's private file system.
   *
   * @returns Promise that resolves to the OPFS root directory handle
   * @throws Error with message "not implemented"
   */
  getDirectory(): Promise<IFileSystemDirectoryHandle>;
}

/**
 * Extension to DataTransferItem interface for drag-and-drop file system access.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFileSystemHandle
 */
export interface IDataTransferItemExtension {
  /**
   * Returns a Promise that resolves to a FileSystemHandle representing the
   * dragged item if it's a file or directory, or null if it's not.
   *
   * @returns Promise that resolves to a file system handle or null
   * @throws Error with message "not implemented"
   */
  getAsFileSystemHandle(): Promise<IFileSystemHandle | null>;
}

/**
 * Stub implementation of StorageManager extension.
 */
export class StorageManagerFSAExtension implements IStorageManagerExtension {
  async getDirectory(): Promise<IFileSystemDirectoryHandle> {
    return Promise.reject(new Error('not implemented'));
  }
}

/**
 * Stub implementation of DataTransferItem extension.
 */
export class DataTransferItemFSAExtension implements IDataTransferItemExtension {
  async getAsFileSystemHandle(): Promise<IFileSystemHandle | null> {
    return Promise.reject(new Error('not implemented'));
  }
}

/**
 * Install File System API extensions on browser interfaces.
 * This monkey-patches the StorageManager and DataTransferItem prototypes
 * to add the missing FSA methods as stubs.
 *
 * @example
 * ```typescript
 * import { installBrowserFSAExtensions } from './fsa/extensions';
 * installBrowserFSAExtensions();
 *
 * // Now StorageManager and DataTransferItem have FSA methods (they will throw "not implemented")
 * try {
 *   await navigator.storage.getDirectory();
 * } catch (error) {
 *   console.log(error.message); // "not implemented"
 * }
 * ```
 */
export function installBrowserFSAExtensions(): void {
  if (typeof globalThis !== 'undefined') {
    // Install StorageManager.getDirectory() if StorageManager exists
    if (typeof StorageManager !== 'undefined' && StorageManager.prototype) {
      if (!(StorageManager.prototype as any).getDirectory) {
        (StorageManager.prototype as any).getDirectory = (): Promise<IFileSystemDirectoryHandle> => {
          return Promise.reject(new Error('not implemented'));
        };
      }
    }

    // Install DataTransferItem.getAsFileSystemHandle() if DataTransferItem exists
    if (typeof DataTransferItem !== 'undefined' && DataTransferItem.prototype) {
      if (!(DataTransferItem.prototype as any).getAsFileSystemHandle) {
        (DataTransferItem.prototype as any).getAsFileSystemHandle = (): Promise<IFileSystemHandle | null> => {
          return Promise.reject(new Error('not implemented'));
        };
      }
    }
  }
}
