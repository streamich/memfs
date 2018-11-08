import { Node } from './node';
import { constants } from './constants';

const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants;

/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats {
  static build(node: Node) {
    const stats = new Stats();
    const { uid, gid, atime, mtime, ctime } = node;

    // Copy all values on Stats from Node, so that if Node values
    // change, values on Stats would still be the old ones,
    // just like in Node fs.

    stats.uid = uid;
    stats.gid = gid;

    stats.atime = atime;
    stats.mtime = mtime;
    stats.ctime = ctime;
    stats.birthtime = ctime;

    stats.atimeMs = atime.getTime();
    stats.mtimeMs = mtime.getTime();
    const ctimeMs = ctime.getTime();
    stats.ctimeMs = ctimeMs;
    stats.birthtimeMs = ctimeMs;

    stats.size = node.getSize();
    stats.mode = node.mode;
    stats.ino = node.ino;
    stats.nlink = node.nlink;

    return stats;
  }

  uid: number = 0;
  gid: number = 0;

  rdev: number = 0;
  blksize: number = 4096;
  ino: number = 0;
  size: number = 0;
  blocks: number = 1;

  atime: Date = null;
  mtime: Date = null;
  ctime: Date = null;
  birthtime: Date = null;

  atimeMs: number = 0.0;
  mtimeMs: number = 0.0;
  ctimeMs: number = 0.0;
  birthtimeMs: number = 0.0;

  dev: number = 0;
  mode: number = 0;
  nlink: number = 0;

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
