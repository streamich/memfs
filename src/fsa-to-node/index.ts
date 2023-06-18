import { FsaNodeFs } from './FsaNodeFs';
import { FsaNodeSyncAdapterWorker } from './worker/FsaNodeSyncAdapterWorker';
import type { IFileSystemDirectoryHandle } from '../fsa/types';

export { FsaNodeFs, FsaNodeSyncAdapterWorker };

export const fsaToNode = (root: IFileSystemDirectoryHandle) => {
  return new FsaNodeFs(root);
};
