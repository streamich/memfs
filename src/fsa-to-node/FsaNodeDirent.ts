import { NodeFileSystemDirectoryHandle, NodeFileSystemFileHandle } from '../node-to-fsa';
import type { IFileSystemHandle } from '../fsa/types';
import type { IDirent, TDataOut } from '../node/types/misc';

export class FsaNodeDirent implements IDirent {
  public constructor(public readonly name: TDataOut, protected readonly handle: IFileSystemHandle) {}

  public isDirectory(): boolean {
    return this.handle instanceof NodeFileSystemDirectoryHandle;
  }

  public isFile(): boolean {
    return this.handle instanceof NodeFileSystemFileHandle;
  }

  public isBlockDevice(): boolean {
    return false;
  }

  public isCharacterDevice(): boolean {
    return false;
  }

  public isSymbolicLink(): boolean {
    return false;
  }

  public isFIFO(): boolean {
    return false;
  }

  public isSocket(): boolean {
    return false;
  }
}
