import { NodeFileSystemDirectoryHandle } from './NodeFileSystemDirectoryHandle';
import { NodeFsaContext, NodeFsaFs } from './types';

export * from './types';
export * from './NodeFileSystemHandle';
export * from './NodeFileSystemDirectoryHandle';
export * from './NodeFileSystemFileHandle';

export const nodeToFsa = (
  fs: NodeFsaFs,
  dirPath: string,
  ctx?: Partial<NodeFsaContext>,
): NodeFileSystemDirectoryHandle => {
  return new NodeFileSystemDirectoryHandle(fs, dirPath, ctx);
};
