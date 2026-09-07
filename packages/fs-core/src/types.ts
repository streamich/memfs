import type { PathLike } from '@jsonjoy.com/fs-node-utils/lib/types/misc';

export type TFileId = PathLike | number; // Number is used as a file descriptor.

export interface StatError {
  errno?: number;
  code: string;
  syscall: string;
  path?: string;
  dest?: string;
  message: string;
  toError(): Error;
}
