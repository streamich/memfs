import type { FsPromisesApi, FsSynchronousApi } from '@jsonjoy.com/fs-node-utils';
import type { FsCommonObjects } from '@jsonjoy.com/fs-node-utils/lib/types/FsCommonObjects';
import type { CoreFsaContext } from '@jsonjoy.com/fs-fsa';

/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type NodeFsaFs = Pick<FsCommonObjects, 'constants'> & { promises: FsPromisesApi } & Pick<
    FsSynchronousApi,
    'openSync' | 'fsyncSync' | 'statSync' | 'closeSync' | 'readSync' | 'truncateSync' | 'writeSync' | 'accessSync'
  >;

export interface NodeFsaContext extends CoreFsaContext {}
