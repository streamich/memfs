import { Node } from './node';
import { constants } from './constants';

const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants;

export type TStatNumber = number | BigInt;

/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats {
  static build(node: Node, bigint: boolean = false) {
    const stats = new Stats();
    const { uid, gid, atime, mtime, ctime } = node;

    const getStatNumber = !bigint
      ? number => number
      : typeof BigInt === 'function'
      ? BigInt
      : () => {
          throw new Error('BigInt is not supported in this environment.');
        };

    // Copy all values on Stats from Node, so that if Node values
    // change, values on Stats would still be the old ones,
    // just like in Node fs.

    stats.uid = getStatNumber(uid);
    stats.gid = getStatNumber(gid);

    stats.atime = atime;
    stats.mtime = mtime;
    stats.ctime = ctime;
    stats.birthtime = ctime;

    stats.atimeMs = getStatNumber(atime.getTime());
    stats.mtimeMs = getStatNumber(mtime.getTime());
    const ctimeMs = getStatNumber(ctime.getTime());
    stats.ctimeMs = ctimeMs;
    stats.birthtimeMs = ctimeMs;

    stats.size = getStatNumber(node.getSize());
    stats.mode = getStatNumber(node.mode);
    stats.ino = getStatNumber(node.ino);
    stats.nlink = getStatNumber(node.nlink);

    return stats;
  }

  uid: TStatNumber = 0;
  gid: TStatNumber = 0;

  rdev: TStatNumber = 0;
  blksize: TStatNumber = 4096;
  ino: TStatNumber = 0;
  size: TStatNumber = 0;
  blocks: TStatNumber = 1;

  atime: Date = null;
  mtime: Date = null;
  ctime: Date = null;
  birthtime: Date = null;

  atimeMs: TStatNumber = 0.0;
  mtimeMs: TStatNumber = 0.0;
  ctimeMs: TStatNumber = 0.0;
  birthtimeMs: TStatNumber = 0.0;

  dev: TStatNumber = 0;
  mode: TStatNumber = 0;
  nlink: TStatNumber = 0;

  private _checkModeProperty(property: number): boolean {
    return (this.mode & S_IFMT) === property;
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
