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

/**
 * Create a new instance of an in-memory File System Access API
 * implementation rooted at the root directory of the filesystem.
 *
 * @param ctx Optional context for the File System Access API.
 * @returns A File System Access API implementation `dir` rooted at
 *     the root directory of the filesystem, as well as the `core`
 *     file system itself.
 */
export const fsa = (ctx?: Partial<CoreFsaContext>) => {
  const core = new Superblock();
  const dir = new CoreFileSystemDirectoryHandle(core, '/', ctx);
  return { dir, core };
};
