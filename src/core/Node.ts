import { FanOut } from 'thingies/lib/fanout';
import process from '../process';
import { Buffer, bufferAllocUnsafe, bufferFrom } from '../vendor/node/internal/buffer';
import { constants, S } from '../constants';

export type NodeEventModify = [type: 'modify'];

export type NodeEventDelete = [type: 'delete'];

export type NodeEvent = NodeEventModify | NodeEventDelete;

const { S_IFMT, S_IFDIR, S_IFREG, S_IFLNK, S_IFCHR } = constants;
const getuid = (): number => process.getuid?.() ?? 0;
const getgid = (): number => process.getgid?.() ?? 0;

/**
 * Node in a file system (like i-node, v-node).
 */
export class Node {
  public readonly changes = new FanOut<NodeEvent>();

  // i-node number.
  ino: number;

  // User ID and group ID.
  private _uid: number = getuid();
  private _gid: number = getgid();

  private _atime = new Date();
  private _mtime = new Date();
  private _ctime = new Date();

  // data: string = '';
  buf: Buffer;
  private bufCapacity: number = 0; // Total allocated capacity
  private bufUsed: number = 0; // Actually used bytes
  rdev: number = 0;

  mode: number; // S_IFDIR, S_IFREG, etc..

  // Number of hard links pointing at this Node.
  private _nlink = 1;

  // Path to another node, if this is a symlink.
  symlink: string;

  constructor(ino: number, mode: number = 0o666) {
    this.mode = mode;
    this.ino = ino;
  }

  public set ctime(ctime: Date) {
    this._ctime = ctime;
  }

  public get ctime(): Date {
    return this._ctime;
  }

  public set uid(uid: number) {
    this._uid = uid;
    this.ctime = new Date();
  }

  public get uid(): number {
    return this._uid;
  }

  public set gid(gid: number) {
    this._gid = gid;
    this.ctime = new Date();
  }

  public get gid(): number {
    return this._gid;
  }

  public set atime(atime: Date) {
    this._atime = atime;
  }

  public get atime(): Date {
    return this._atime;
  }

  public set mtime(mtime: Date) {
    this._mtime = mtime;
    this.ctime = new Date();
  }

  public get mtime(): Date {
    return this._mtime;
  }

  public get perm(): number {
    return this.mode & ~S_IFMT;
  }

  public set perm(perm: number) {
    this.mode = (this.mode & S_IFMT) | (perm & ~S_IFMT);
    this.ctime = new Date();
  }

  public set nlink(nlink: number) {
    this._nlink = nlink;
    this.ctime = new Date();
  }

  public get nlink(): number {
    return this._nlink;
  }

  getString(encoding: BufferEncoding = 'utf8'): string {
    this.atime = new Date();
    return this.getBuffer().toString(encoding);
  }

  setString(str: string) {
    // this.setBuffer(bufferFrom(str, 'utf8'));
    this.buf = bufferFrom(str, 'utf8');
    this.bufCapacity = this.buf.length;
    this.bufUsed = this.buf.length;
    this.touch();
  }

  getBuffer(): Buffer {
    this.atime = new Date();
    if (!this.buf) this.buf = bufferAllocUnsafe(0);
    return bufferFrom(this.buf.subarray(0, this.bufUsed)); // Return a copy of used portion.
  }

  setBuffer(buf: Buffer) {
    this.buf = bufferFrom(buf); // Creates a copy of data.
    this.bufCapacity = this.buf.length;
    this.bufUsed = this.buf.length;
    this.touch();
  }

  getSize(): number {
    return this.bufUsed;
  }

  setModeProperty(property: number) {
    this.mode = property;
  }

  isFile() {
    return (this.mode & S_IFMT) === S_IFREG;
  }

  isDirectory() {
    return (this.mode & S_IFMT) === S_IFDIR;
  }

  isSymlink() {
    // return !!this.symlink;
    return (this.mode & S_IFMT) === S_IFLNK;
  }

  isCharacterDevice() {
    return (this.mode & S_IFMT) === S_IFCHR;
  }

  makeSymlink(symlink: string) {
    this.mode = S_IFLNK | 0o666;
    this.symlink = symlink;
  }

  write(buf: Buffer, off: number = 0, len: number = buf.length, pos: number = 0): number {
    if (!this.buf) {
      this.buf = bufferAllocUnsafe(0);
      this.bufCapacity = 0;
      this.bufUsed = 0;
    }

    const requiredSize = pos + len;
    if (requiredSize > this.bufCapacity) {
      // Calculate new capacity: max of 2x current capacity or required size, with minimum of 64 bytes
      let newCapacity = Math.max(this.bufCapacity * 2, requiredSize);
      if (newCapacity < 64) newCapacity = 64;

      const newBuf = bufferAllocUnsafe(newCapacity);
      if (this.bufUsed > 0) {
        this.buf.copy(newBuf, 0, 0, this.bufUsed);
      }
      this.buf = newBuf;
      this.bufCapacity = newCapacity;
    }

    // Zero-fill any gap between current used size and write position
    if (pos > this.bufUsed) {
      this.buf.fill(0, this.bufUsed, pos);
    }

    buf.copy(this.buf, pos, off, off + len);

    // Update used size if we wrote beyond current used size
    if (requiredSize > this.bufUsed) {
      this.bufUsed = requiredSize;
    }

    this.touch();

    return len;
  }

  // Returns the number of bytes read.
  read(
    buf: Buffer | ArrayBufferView | DataView,
    off: number = 0,
    len: number = buf.byteLength,
    pos: number = 0,
  ): number {
    this.atime = new Date();
    if (!this.buf) {
      this.buf = bufferAllocUnsafe(0);
      this.bufCapacity = 0;
      this.bufUsed = 0;
    }
    if (pos >= this.bufUsed) return 0;
    let actualLen = len;
    if (actualLen > buf.byteLength) {
      actualLen = buf.byteLength;
    }
    if (actualLen + pos > this.bufUsed) {
      actualLen = this.bufUsed - pos;
    }
    const buf2 = buf instanceof Buffer ? buf : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
    this.buf.copy(buf2, off, pos, pos + actualLen);
    return actualLen;
  }

  truncate(len: number = 0) {
    if (!len) {
      this.buf = bufferAllocUnsafe(0);
      this.bufCapacity = 0;
      this.bufUsed = 0;
    } else {
      if (!this.buf) {
        this.buf = bufferAllocUnsafe(0);
        this.bufCapacity = 0;
        this.bufUsed = 0;
      }
      if (len <= this.bufUsed) {
        // Shrinking: keep capacity but reduce used size
        this.bufUsed = len;
      } else {
        // Growing: may need to allocate more capacity
        if (len > this.bufCapacity) {
          // Need more capacity - allocate with some overallocation
          let newCapacity = len;
          if (newCapacity < 64) newCapacity = 64;
          const buf = bufferAllocUnsafe(newCapacity);
          if (this.bufUsed > 0) {
            this.buf.copy(buf, 0, 0, this.bufUsed);
          }
          buf.fill(0, this.bufUsed, len);
          this.buf = buf;
          this.bufCapacity = newCapacity;
        } else {
          // Have enough capacity, just zero-fill the new space
          this.buf.fill(0, this.bufUsed, len);
        }
        this.bufUsed = len;
      }
    }

    this.touch();
  }

  chmod(perm: number) {
    this.mode = (this.mode & S_IFMT) | (perm & ~S_IFMT);
    this.touch();
  }

  chown(uid: number, gid: number) {
    this.uid = uid;
    this.gid = gid;
    this.touch();
  }

  touch() {
    this.mtime = new Date();
    this.changes.emit(['modify']);
  }

  canRead(uid: number = getuid(), gid: number = getgid()): boolean {
    if (this.perm & S.IROTH) {
      return true;
    }

    if (gid === this.gid) {
      if (this.perm & S.IRGRP) {
        return true;
      }
    }

    if (uid === this.uid) {
      if (this.perm & S.IRUSR) {
        return true;
      }
    }

    return false;
  }

  canWrite(uid: number = getuid(), gid: number = getgid()): boolean {
    if (this.perm & S.IWOTH) {
      return true;
    }

    if (gid === this.gid) {
      if (this.perm & S.IWGRP) {
        return true;
      }
    }

    if (uid === this.uid) {
      if (this.perm & S.IWUSR) {
        return true;
      }
    }

    return false;
  }

  canExecute(uid: number = getuid(), gid: number = getgid()): boolean {
    if (this.perm & S.IXOTH) {
      return true;
    }

    if (gid === this.gid) {
      if (this.perm & S.IXGRP) {
        return true;
      }
    }

    if (uid === this.uid) {
      if (this.perm & S.IXUSR) {
        return true;
      }
    }

    return false;
  }

  del() {
    this.changes.emit(['delete']);
  }

  toJSON() {
    return {
      ino: this.ino,
      uid: this.uid,
      gid: this.gid,
      atime: this.atime.getTime(),
      mtime: this.mtime.getTime(),
      ctime: this.ctime.getTime(),
      perm: this.perm,
      mode: this.mode,
      nlink: this.nlink,
      symlink: this.symlink,
      data: this.getString(),
    };
  }
}
