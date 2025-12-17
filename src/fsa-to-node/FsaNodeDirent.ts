import type { IDirent, TDataOut } from '../node/types/misc';

export class FsaNodeDirent implements IDirent {
  public readonly path: string
  public constructor(
    public readonly name: TDataOut,
    public readonly parentPath: string,
    protected readonly kind: 'file' | 'directory',
  ) {
    this.path = parentPath;
  }

  public isDirectory(): boolean {
    return this.kind === 'directory';
  }

  public isFile(): boolean {
    return this.kind === 'file';
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
