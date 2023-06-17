import { NodeFileSystemDirectoryHandle, NodeFileSystemFileHandle } from '../node-to-fsa';
import type { IFileSystemHandle } from '../fsa/types';
import type * as misc from '../node/types/misc';

const time: number = 0;
const timex: bigint = typeof BigInt === 'function' ? BigInt(time) : (time as any as bigint);
const date = new Date(time);

export class FsaNodeStats<T = misc.TStatNumber> implements misc.IStats<T> {
  public readonly uid: T;
  public readonly gid: T;
  public readonly rdev: T;
  public readonly blksize: T;
  public readonly ino: T;
  public readonly size: T;
  public readonly blocks: T;
  public readonly atime: Date;
  public readonly mtime: Date;
  public readonly ctime: Date;
  public readonly birthtime: Date;
  public readonly atimeMs: T;
  public readonly mtimeMs: T;
  public readonly ctimeMs: T;
  public readonly birthtimeMs: T;
  public readonly dev: T;
  public readonly mode: T;
  public readonly nlink: T;

  public constructor(isBigInt: boolean, size: T, protected readonly handle: IFileSystemHandle) {
    const dummy = (isBigInt ? timex : time) as any as T;
    this.uid = dummy;
    this.gid = dummy;
    this.rdev = dummy;
    this.blksize = dummy;
    this.ino = dummy;
    this.size = size;
    this.blocks = dummy;
    this.atime = date;
    this.mtime = date;
    this.ctime = date;
    this.birthtime = date;
    this.atimeMs = dummy;
    this.mtimeMs = dummy;
    this.ctimeMs = dummy;
    this.birthtimeMs = dummy;
    this.dev = dummy;
    this.mode = dummy;
    this.nlink = dummy;
  }

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
