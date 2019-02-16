import { Node } from './node';
import { constants } from './constants';
import getBigInt from './getBigInt';

const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants;

export type TStatNumber = number | bigint;

/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats<T = TStatNumber> {
  static build(node: Node, bigint: false): Stats<number>;
  static build(node: Node, bigint: true): Stats<bigint>;
  static build(node: Node, bigint?: boolean): Stats<TStatNumber>;
  static build(node: Node, bigint: boolean = false): Stats<TStatNumber> {
    const stats = new Stats<TStatNumber>();
    const { uid, gid, atime, mtime, ctime } = node;

    const getStatNumber = !bigint ? number => number : getBigInt;

    // Copy all values on Stats from Node, so that if Node values
    // change, values on Stats would still be the old ones,
    // just like in Node fs.

    stats.uid = getStatNumber(uid);
    stats.gid = getStatNumber(gid);

    stats.rdev = getStatNumber(0);
    stats.blksize = getStatNumber(4096);
    stats.ino = getStatNumber(node.ino);
    stats.size = getStatNumber(node.getSize());
    stats.blocks = getStatNumber(1);

    stats.atime = atime;
    stats.mtime = mtime;
    stats.ctime = ctime;
    stats.birthtime = ctime;

    stats.atimeMs = getStatNumber(atime.getTime());
    stats.mtimeMs = getStatNumber(mtime.getTime());
    const ctimeMs = getStatNumber(ctime.getTime());
    stats.ctimeMs = ctimeMs;
    stats.birthtimeMs = ctimeMs;

    stats.dev = getStatNumber(0);
    stats.mode = getStatNumber(node.mode);
    stats.nlink = getStatNumber(node.nlink);

    return stats;
  }

  uid: T;
  gid: T;

  rdev: T;
  blksize: T;
  ino: T;
  size: T;
  blocks: T;

  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;

  atimeMs: T;
  mtimeMs: T;
  ctimeMs: T;
  birthtimeMs: T;

  dev: T;
  mode: T;
  nlink: T;

  private _checkModeProperty(property: number): boolean {
    return (Number(this.mode) & S_IFMT) === property;
  }

  isDirectory(): boolean {
    return this._checkModeProperty(S_IFDIR);
  }

  isFile(): boolean {
    return this._checkModeProperty(S_IFREG);
  }

  isBlockDevice(): boolean {
    return this._checkModeProperty(S_IFBLK);
  }

  isCharacterDevice(): boolean {
    return this._checkModeProperty(S_IFCHR);
  }

  isSymbolicLink(): boolean {
    return this._checkModeProperty(S_IFLNK);
  }

  isFIFO(): boolean {
    return this._checkModeProperty(S_IFIFO);
  }

  isSocket(): boolean {
    return this._checkModeProperty(S_IFSOCK);
  }
}

export default Stats;
