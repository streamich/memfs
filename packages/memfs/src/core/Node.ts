import { FanOut } from 'thingies/lib/fanout';
import process from '../process';
import { Buffer, bufferAllocUnsafe, bufferFrom } from '@jsonjoy.com/node-fs-dependencies/lib/internal/buffer';
import { constants, S } from '@jsonjoy.com/node-fs-utils';

export type NodeEventModify = [type: 'modify'];

export type NodeEventDelete = [type: 'delete'];

export type NodeEvent = NodeEventModify | NodeEventDelete;

const { S_IFMT, S_IFDIR, S_IFREG, S_IFLNK, S_IFCHR } = constants;
const getuid = (): number => process.getuid?.() ?? 0;
const getgid = (): number => process.getgid?.() ?? 0;
const EMPTY_BUFFER = bufferAllocUnsafe(0);

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

  buf: Buffer = EMPTY_BUFFER;

  /** Total allocated memory capacity for this node. */
  private capacity: number = 0;

  /** Actually used bytes to store content. */
  private size: number = 0;

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
    this._setBuf(bufferFrom(str, 'utf8'));
  }

  getBuffer(): Buffer {
    this.atime = new Date();
    if (!this.buf) this.buf = bufferAllocUnsafe(0);
    return bufferFrom(this.buf.subarray(0, this.size)); // Return a copy of used portion.
  }

  setBuffer(buf: Buffer) {
    const copy = bufferFrom(buf); // Creates a copy of data.
    this._setBuf(copy);
  }

  private _setBuf(buf: Buffer): void {
    const size = buf.length;
    this.buf = buf;
    this.capacity = size;
    this.size = size;
    this.touch();
  }

  getSize(): number {
    return this.size;
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
    const bufLength = buf.length;
    if (off + len > bufLength) len = bufLength - off;
    if (len <= 0) return 0;
    const requiredSize = pos + len;
    if (requiredSize > this.capacity) {
      let newCapacity = Math.max(this.capacity * 2, 64);
      while (newCapacity < requiredSize) newCapacity *= 2;
      const newBuf = bufferAllocUnsafe(newCapacity);
      if (this.size > 0) this.buf.copy(newBuf, 0, 0, this.size);
      this.buf = newBuf;
      this.capacity = newCapacity;
    }
    if (pos > this.size) this.buf.fill(0, this.size, pos);
    buf.copy(this.buf, pos, off, off + len);
    if (requiredSize > this.size) this.size = requiredSize;
    this.touch();
    return len;
  }

  /**
   * Read data from the file.
   *
   * @param buf Buffer to read data into.
   * @param off Offset int the `buf` where to start writing data.
   * @param len How many bytes to read. Equals to `buf.byteLength` by default.
   * @param pos Position offset in file where to start reading. Defaults to `0`.
   * @returns Returns the number of bytes read.
   */
  read(
    buf: Buffer | ArrayBufferView | DataView,
    off: number = 0,
    len: number = buf.byteLength,
    pos: number = 0,
  ): number {
    this.atime = new Date();
    if (pos >= this.size) return 0;
    let actualLen = len;
    if (actualLen > buf.byteLength) actualLen = buf.byteLength;
    if (actualLen + pos > this.size) actualLen = this.size - pos;
    if (actualLen <= 0) return 0;
    const buf2 = buf instanceof Buffer ? buf : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
    this.buf.copy(buf2, off, pos, pos + actualLen);
    return actualLen;
  }

  truncate(len: number = 0) {
    if (!len) {
      this.buf = EMPTY_BUFFER;
      this.capacity = 0;
      this.size = 0;
      this.touch();
      return;
    }
    if (len <= this.size) this.size = len;
    else {
      if (len > this.capacity) {
        let newCapacity = Math.max(this.capacity * 2, 64);
        while (newCapacity < len) newCapacity *= 2;
        const buf = bufferAllocUnsafe(newCapacity);
        if (this.size > 0) this.buf.copy(buf, 0, 0, this.size);
        buf.fill(0, this.size, len);
        this.buf = buf;
        this.capacity = newCapacity;
      } else this.buf.fill(0, this.size, len);
      this.size = len;
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
