// Inlined types from node:fs to avoid implicit dependencies

import type { Buffer } from './buffer';
import type { URL } from './url';

export type PathLike = string | Buffer | URL;

// tslint:disable-next-line:no-namespace
export namespace symlink {
  export type Type = 'dir' | 'file' | 'junction';
}
