import { Link } from '../node';
import { constants } from '../constants';
import { TEncodingExtended, strToEncoding, TDataOut } from '../encoding';
import type { IDirent } from './types/misc';

const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants;

/**
 * A directory entry, like `fs.Dirent`.
 */
export class Dirent implements IDirent {
  static build(link: Link, encoding: TEncodingExtended | undefined) {
    const dirent = new Dirent();
    const { mode } = link.getNode();

    dirent.name = link.getName();
    dirent.mode = mode;
    dirent.path = link.getParentPath();
    dirent.parentPath = dirent.path;

    return dirent;
  }

  name = '';
  path = '';
  parentPath = '';
  private mode: number = 0;

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

export default Dirent;
