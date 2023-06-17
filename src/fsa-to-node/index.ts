import { FsaNodeFs } from './FsaNodeFs';
import type { IFileSystemDirectoryHandle } from '../fsa/types';

export { FsaNodeFs };

export const fsaToNode = (root: IFileSystemDirectoryHandle) => {
  return new FsaNodeFs(root);
};
