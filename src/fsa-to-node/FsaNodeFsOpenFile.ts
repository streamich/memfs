import type * as fsa from '../fsa/types';
import type * as misc from '../node/types/misc';

export class FsaNodeFsOpenFile {
  public constructor (
    public readonly fd: number,
    public readonly mode: misc.TMode,
    public readonly flags: number,
    public readonly file: fsa.IFileSystemFileHandle,
  ) {}
}
