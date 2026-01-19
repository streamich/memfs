import type { FsPromisesApi, FsSynchronousApi } from '@jsonjoy.com/node-fs-utils';
import type { FsCommonObjects } from '@jsonjoy.com/node-fs-utils/lib/types/FsCommonObjects';
import type { FileLockManager } from '../fsa/FileLockManager';

/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type NodeFsaFs = Pick<FsCommonObjects, 'constants'> & { promises: FsPromisesApi } & Pick<
    FsSynchronousApi,
    'openSync' | 'fsyncSync' | 'statSync' | 'closeSync' | 'readSync' | 'truncateSync' | 'writeSync' | 'accessSync'
  >;

export interface NodeFsaContext {
  separator: '/' | '\\';
  /** Whether synchronous file handles are allowed. */
  syncHandleAllowed: boolean;
  /** Whether writes are allowed, defaults to `read`. */
  mode: 'read' | 'readwrite';
  /** File lock manager for this context. */
  locks: FileLockManager;
}
