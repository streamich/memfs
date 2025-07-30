import { Buffer } from '../internal/buffer';
import { constants } from '../constants';
import Stats from '../Stats';
import { Link } from './Link';
import { Node } from './Node';

const { O_APPEND } = constants;

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
