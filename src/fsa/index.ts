import { CoreFileSystemDirectoryHandle } from './CoreFileSystemDirectoryHandle';
import { CoreFsaContext } from './types';
import { Superblock } from '../core/Superblock';

export * from './types';
export * from './CoreFileSystemHandle';
export * from './CoreFileSystemDirectoryHandle';
export * from './CoreFileSystemFileHandle';
export * from './CoreFileSystemSyncAccessHandle';
export * from './CoreFileSystemWritableFileStream';
export * from './CorePermissionStatus';

/**
 * Creates a File System Access API implementation on top of a Superblock.
 */
export const coreToFsa = (
  core: Superblock,
  dirPath: string = '/',
  ctx?: Partial<CoreFsaContext>,
): CoreFileSystemDirectoryHandle => {
  return new CoreFileSystemDirectoryHandle(core, dirPath, ctx);
};
