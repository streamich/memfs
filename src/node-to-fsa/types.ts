import type {IFs} from "..";

/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type NodeFsaFs = Pick<IFs, 'promises'>;

export interface NodeFsaContext {
  separator: '/' | '\\';
}

export interface NodeFileSystemHandlePermissionDescriptor {
  mode: 'read' | 'readwrite';
}
