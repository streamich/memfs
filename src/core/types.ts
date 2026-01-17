import type { PathLike } from '../node/types/misc';

export type TFileId = PathLike | number; // Number is used as a file descriptor.

export interface StatError {
  code: string;
  message: string;
  path?: string;
  toError(): Error;
}
