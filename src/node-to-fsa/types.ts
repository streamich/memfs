/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type FsaNodeFs = Pick<typeof import('fs'), 'promises'>;

export interface NodeFileSystemHandlePermissionDescriptor {
  mode: 'read' | 'readwrite';
}
