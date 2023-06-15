import type { IFs } from '..';

/**
 * Required Node.js `fs` module functions for File System Access API.
 */
export type NodeFsaFs = Pick<
  IFs,
  | 'promises'
  | 'constants'
  | 'openSync'
  | 'fsyncSync'
  | 'statSync'
  | 'closeSync'
  | 'readSync'
  | 'truncateSync'
  | 'writeSync'
>;

export interface NodeFsaContext {
  separator: '/' | '\\';
  /** Whether synchronous file handles are allowed. */
  syncHandleAllowed: boolean;
  /** Whether writes are allowed, defaults to `read`. */
  mode: 'read' | 'readwrite';
}
