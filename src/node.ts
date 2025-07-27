import process from './process';
import { Buffer, bufferAllocUnsafe, bufferFrom } from './internal/buffer';
import { constants, S } from './constants';
import { Volume } from './volume';
import { EventEmitter } from 'events';
import Stats from './Stats';

const { S_IFMT, S_IFDIR, S_IFREG, S_IFLNK, S_IFCHR, O_APPEND } = constants;
const getuid = (): number => process.getuid?.() ?? 0;
const getgid = (): number => process.getgid?.() ?? 0;

export const SEP = '/';

/**
 * Node in a file system (like i-node, v-node).
 */
export class Node extends EventEmitter {
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
  rdev: number = 0;

  mode: number; // S_IFDIR, S_IFREG, etc..

  // Number of hard links pointing at this Node.
  private _nlink = 1;

  // Path to another node, if this is a symlink.
  symlink: string;

  constructor(ino: number, mode: number = 0o666) {
    super();
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
    this.ctime = new Date();
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

  getString(encoding = 'utf8'): string {
    this.atime = new Date();
    return this.getBuffer().toString(encoding);
  }

  setString(str: string) {
    // this.setBuffer(bufferFrom(str, 'utf8'));
    this.buf = bufferFrom(str, 'utf8');
    this.touch();
  }

  getBuffer(): Buffer {
    this.atime = new Date();
    if (!this.buf) this.setBuffer(bufferAllocUnsafe(0));
    return bufferFrom(this.buf); // Return a copy.
  }

  setBuffer(buf: Buffer) {
    this.buf = bufferFrom(buf); // Creates a copy of data.
    this.touch();
  }

  getSize(): number {
    return this.buf ? this.buf.length : 0;
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
    if (!this.buf) this.buf = bufferAllocUnsafe(0);

    if (pos + len > this.buf.length) {
      const newBuf = bufferAllocUnsafe(pos + len);
      this.buf.copy(newBuf, 0, 0, this.buf.length);
      this.buf = newBuf;
    }

    buf.copy(this.buf, pos, off, off + len);

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
    if (!this.buf) this.buf = bufferAllocUnsafe(0);
    if (pos >= this.buf.length) return 0;
    let actualLen = len;
    if (actualLen > buf.byteLength) {
      actualLen = buf.byteLength;
    }
    if (actualLen + pos > this.buf.length) {
      actualLen = this.buf.length - pos;
    }
    const buf2 = buf instanceof Buffer ? buf : Buffer.from(buf.buffer);
    this.buf.copy(buf2, off, pos, pos + actualLen);
    return actualLen;
  }

  truncate(len: number = 0) {
    if (!len) this.buf = bufferAllocUnsafe(0);
    else {
      if (!this.buf) this.buf = bufferAllocUnsafe(0);
      if (len <= this.buf.length) {
        this.buf = this.buf.slice(0, len);
      } else {
        const buf = bufferAllocUnsafe(len);
        this.buf.copy(buf);
        buf.fill(0, this.buf.length);
        this.buf = buf;
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
    this.emit('change', this);
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
    this.emit('delete', this);
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

/**
 * Represents a hard link that points to an i-node `node`.
 */
export class Link extends EventEmitter {
  vol: Volume;

  parent: Link;

  children = new Map<string, Link | undefined>();

  // Path to this node as Array: ['usr', 'bin', 'node'].
  private _steps: string[] = [];

  // "i-node" of this hard link.
  node: Node;

  // "i-node" number of the node.
  ino: number = 0;

  // Number of children.
  length: number = 0;

  name: string;

  get steps() {
    return this._steps;
  }

  // Recursively sync children steps, e.g. in case of dir rename
  set steps(val) {
    this._steps = val;
    for (const [child, link] of this.children.entries()) {
      if (child === '.' || child === '..') {
        continue;
      }
      link?.syncSteps();
    }
  }

  constructor(vol: Volume, parent: Link, name: string) {
    super();
    this.vol = vol;
    this.parent = parent;
    this.name = name;
    this.syncSteps();
  }

  setNode(node: Node) {
    this.node = node;
    this.ino = node.ino;
  }

  getNode(): Node {
    return this.node;
  }

  createChild(name: string, node: Node = this.vol.createNode(S_IFREG | 0o666)): Link {
    const link = new Link(this.vol, this, name);
    link.setNode(node);

    if (node.isDirectory()) {
      link.children.set('.', link);
      link.getNode().nlink++;
    }

    this.setChild(name, link);

    return link;
  }

  setChild(name: string, link: Link = new Link(this.vol, this, name)): Link {
    this.children.set(name, link);
    link.parent = this;
    this.length++;

    const node = link.getNode();
    if (node.isDirectory()) {
      link.children.set('..', this);
      this.getNode().nlink++;
    }

    this.getNode().mtime = new Date();
    this.emit('child:add', link, this);

    return link;
  }

  deleteChild(link: Link) {
    const node = link.getNode();
    if (node.isDirectory()) {
      link.children.delete('..');
      this.getNode().nlink--;
    }
    this.children.delete(link.getName());
    this.length--;

    this.getNode().mtime = new Date();
    this.emit('child:delete', link, this);
  }

  getChild(name: string): Link | undefined {
    this.getNode().mtime = new Date();
    return this.children.get(name);
  }

  getPath(): string {
    return this.steps.join(SEP);
  }

  getParentPath(): string {
    return this.steps.slice(0, -1).join(SEP);
  }

  getName(): string {
    return this.steps[this.steps.length - 1];
  }

  // del() {
  //     const parent = this.parent;
  //     if(parent) {
  //         parent.deleteChild(link);
  //     }
  //     this.parent = null;
  //     this.vol = null;
  // }

  toJSON() {
    return {
      steps: this.steps,
      ino: this.ino,
      children: Array.from(this.children.keys()),
    };
  }

  syncSteps() {
    this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name];
  }
}

/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 */
export class File {
  fd: number;

  /**
   * Hard link that this file opened.
   * @type {any}
   */
  link: Link;

  /**
   * Reference to a `Node`.
   * @type {Node}
   */
  node: Node;

  /**
   * A cursor/offset position in a file, where data will be written on write.
   * User can "seek" this position.
   */
  position: number;

  // Flags used when opening the file.
  flags: number;

  /**
   * Open a Link-Node pair. `node` is provided separately as that might be a different node
   * rather the one `link` points to, because it might be a symlink.
   * @param link
   * @param node
   * @param flags
   * @param fd
   */
  constructor(link: Link, node: Node, flags: number, fd: number) {
    this.link = link;
    this.node = node;
    this.flags = flags;
    this.fd = fd;
    this.position = 0;
    if (this.flags & O_APPEND) this.position = this.getSize();
  }

  getString(encoding = 'utf8'): string {
    return this.node.getString();
  }

  setString(str: string) {
    this.node.setString(str);
  }

  getBuffer(): Buffer {
    return this.node.getBuffer();
  }

  setBuffer(buf: Buffer) {
    this.node.setBuffer(buf);
  }

  getSize(): number {
    return this.node.getSize();
  }

  truncate(len?: number) {
    this.node.truncate(len);
  }

  seekTo(position: number) {
    this.position = position;
  }

  stats(): Stats<number> {
    return Stats.build(this.node) as Stats<number>;
  }

  write(buf: Buffer, offset: number = 0, length: number = buf.length, position?: number | null): number {
    if (typeof position !== 'number') position = this.position;
    const bytes = this.node.write(buf, offset, length, position);
    this.position = position + bytes;
    return bytes;
  }

  read(
    buf: Buffer | ArrayBufferView | DataView,
    offset: number = 0,
    length: number = buf.byteLength,
    position?: number,
  ): number {
    if (typeof position !== 'number') position = this.position;
    const bytes = this.node.read(buf, offset, length, position);
    this.position = position + bytes;
    return bytes;
  }

  chmod(perm: number) {
    this.node.chmod(perm);
  }

  chown(uid: number, gid: number) {
    this.node.chown(uid, gid);
  }
}
