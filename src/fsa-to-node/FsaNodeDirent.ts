import {NodeFileSystemDirectoryHandle, NodeFileSystemFileHandle} from "../node-to-fsa";
import type {IFileSystemHandle} from "../fsa/types";
import type {IDirent, TDataOut} from "../node/types/misc";

export class FsaNodeDirent implements IDirent {
  public constructor(public readonly name: TDataOut, protected readonly handle: IFileSystemHandle) {}

  isDirectory(): boolean {
    return this.handle instanceof NodeFileSystemDirectoryHandle;
  }
  
  isFile(): boolean {
    return this.handle instanceof NodeFileSystemFileHandle;
  }

  isBlockDevice(): boolean {
    return false;
  }

  isCharacterDevice(): boolean {
    return false;
  }

  isSymbolicLink(): boolean {
    return false;
  }

  public isFIFO(): boolean {
    return false;
  }

  public isSocket(): boolean {
    return false;
  }
}
