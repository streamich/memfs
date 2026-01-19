import type { PathLike } from '@jsonjoy.com/fs-node-utils/lib/types/misc';

export type TFileId = PathLike | number; // Number is used as a file descriptor.

export interface StatError {
  code: string;
  message: string;
  path?: string;
  toError(): Error;
}
