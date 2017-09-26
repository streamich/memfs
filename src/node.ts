import process from './process';
import {constants, S} from "./constants";
import {Volume} from "./volume";
import {EventEmitter} from "events";
const {S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK, O_APPEND} = constants;


export const SEP = '/';


/**
 * Node in a file system (like i-node, v-node).
 */
export class Node extends EventEmitter {

    // i-node number.
    ino: number;

    // User ID and group ID.
    uid: number = process.getuid();
    gid: number = process.getgid();

    atime = new Date;
    mtime = new Date;
    ctime = new Date;

    // data: string = '';
    buf: Buffer = null;

    perm = 0o666; // Permissions `chmod`, `fchmod`

    mode = S_IFREG; // S_IFDIR, S_IFREG, etc.. (file by default?)

    // Number of hard links pointing at this Node.
    nlink = 1;

    // Steps to another node, if this node is a symlink.
    symlink: string[] = null;

    constructor(ino: number, perm: number = 0o666) {
        super();
        this.perm = perm;
        this.mode |= perm;
        this.ino = ino;
    }

    getString(encoding = 'utf8'): string {
        return this.getBuffer().toString(encoding);
    }

    setString(str: string) {
        // this.setBuffer(Buffer.from(str, 'utf8'));
        this.buf = Buffer.from(str, 'utf8');
        this.touch();
    }

    getBuffer(): Buffer {
        if(!this.buf) this.setBuffer(Buffer.allocUnsafe(0));
        return Buffer.from(this.buf); // Return a copy.
    }

    setBuffer(buf: Buffer) {
        this.buf = Buffer.from(buf); // Creates a copy of data.
        this.touch();
    }

    getSize(): number {
        return this.buf ? this.buf.length : 0;
    }

    setModeProperty(property: number) {
        this.mode = (this.mode & ~S_IFMT) | property;
    }

    setIsFile() {
        this.setModeProperty(S_IFREG);
    }

    setIsDirectory() {
        this.setModeProperty(S_IFDIR);
    }

    setIsSymlink() {
        this.setModeProperty(S_IFLNK);
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

    makeSymlink(steps: string[]) {
        this.symlink = steps;
        this.setIsSymlink();
    }

    write(buf: Buffer, off: number = 0, len: number = buf.length, pos: number = 0): number {
        if(!this.buf) this.buf = Buffer.allocUnsafe(0);

        if(pos + len > this.buf.length) {
            const newBuf = Buffer.allocUnsafe(pos + len);
            this.buf.copy(newBuf, 0, 0, this.buf.length);
            this.buf = newBuf;
        }

        buf.copy(this.buf, pos, off, off + len);

        this.touch();

        return len;
    }

    // Returns the number of bytes read.
    read(buf: Buffer | Uint8Array, off: number = 0, len: number = buf.byteLength, pos: number = 0): number {
        if(!this.buf) this.buf = Buffer.allocUnsafe(0);

        let actualLen = len;
        if(actualLen > buf.byteLength) {
            actualLen = buf.byteLength;
        }
        if(actualLen + pos > this.buf.length) {
            actualLen = this.buf.length - pos;
        }

        this.buf.copy(buf as Buffer, off, pos, pos + actualLen);
        return actualLen;
    }

    truncate(len: number = 0) {
        if(!len) this.buf = Buffer.allocUnsafe(0);
        else {
            if(!this.buf) this.buf = Buffer.allocUnsafe(0);
            if(len <= this.buf.length) {
                this.buf = this.buf.slice(0, len);
            } else {
                const buf = Buffer.allocUnsafe(0);
                this.buf.copy(buf);
                buf.fill(0, len);
            }
        }

        this.touch();
    }

    chmod(perm: number) {
        this.perm = perm;
        this.mode |= perm;
        this.touch();
    }

    chown(uid: number, gid: number) {
        this.uid = uid;
        this.gid = gid;
        this.touch();
    }

    touch() {
        this.mtime = new Date;
        this.emit('change', this);
    }

    canRead(uid: number = process.getuid(), gid: number = process.getgid()): boolean {
        if(this.perm & S.IROTH) {
            return true;
        }

        if(gid === this.gid) {
            if(this.perm & S.IRGRP) {
                return true;
            }
        }

        if(uid === this.uid) {
            if(this.perm & S.IRUSR) {
                return true;
            }
        }

        return false;
    }

    canWrite(uid: number = process.getuid(), gid: number = process.getgid()): boolean {
        if(this.perm & S.IWOTH) {
            return true;
        }

        if(gid === this.gid) {
            if(this.perm & S.IWGRP) {
                return true;
            }
        }

        if(uid === this.uid) {
            if(this.perm & S.IWUSR) {
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

    parent: Link = null;

    children: {[child: string]: Link} = {};

    // Path to this node as Array: ['usr', 'bin', 'node'].
    steps: string[] = [];

    // "i-node" of this hard link.
    node: Node = null;

    // "i-node" number of the node.
    ino: Number = 0;

    // Number of children.
    length: number = 0;

    constructor(vol: Volume, parent: Link, name: string) {
        super();
        this.vol = vol;
        this.parent = parent;
        this.steps = parent ? parent.steps.concat([name]) : [name];
    }

    setNode(node: Node) {
        this.node = node;
        this.ino = node.ino;
    }

    getNode(): Node {
        return this.node;
    }

    createChild(name: string, node: Node = this.vol.createNode()): Link {
        const link = new Link(this.vol, this, name);
        link.setNode(node);

        if(node.isDirectory()) {
            // link.setChild('.', link);
            // link.getNode().nlink++;

            // link.setChild('..', this);
            // this.getNode().nlink++;
        }

        this.setChild(name, link);

        return link;
    }

    setChild(name: string, link: Link = new Link(this.vol, this, name)): Link {
        this.children[name] = link;
        link.parent = this;
        this.length++;

        this.emit('child:add', link, this);

        return link;
    }

    deleteChild(link: Link) {
        delete this.children[link.getName()];
        this.length--;

        this.emit('child:delete', link, this);
    }

    getChild(name: string): Link {
        return this.children[name];
    }

    getPath(): string {
        return this.steps.join(SEP);
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

    /**
     * Walk the tree path and return the `Link` at that location, if any.
     * @param steps {string[]} Desired location.
     * @param stop {number} Max steps to go into.
     * @param i {number} Current step in the `steps` array.
     * @returns {any}
     */
    walk(steps: string[], stop: number = steps.length, i: number = 0): Link {
        if(i >= steps.length) return this;
        if(i >= stop) return this;

        const step = steps[i];
        const link = this.getChild(step);
        if(!link) return null;
        return link.walk(steps, stop, i + 1);
    }

    toJSON() {
        for(let ch in this.children) {
            console.log('ch', ch);
        }
        return {
            steps: this.steps,
            ino: this.ino,
            children: Object.keys(this.children),
        };
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
    link: Link = null;

    /**
     * Reference to a `Node`.
     * @type {Node}
     */
    node: Node = null;

    /**
     * A cursor/offset position in a file, where data will be written on write.
     * User can "seek" this position.
     */
    position: number = 0;

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

    stats(): Stats {
        return Stats.build(this.node);
    }

    write(buf: Buffer, offset: number = 0, length: number = buf.length, position?: number): number {
        if(typeof position !== 'number') position = this.position;
        if(this.flags & O_APPEND) position = this.getSize();
        const bytes = this.node.write(buf, offset, length, position);
        this.position = position + bytes;
        return bytes;
    }

    read(buf: Buffer | Uint8Array, offset: number = 0, length: number = buf.byteLength, position?: number): number {
        if(typeof position !== 'number') position = this.position;
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


/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats {

    static build(node: Node) {
        const stats = new Stats;
        const {uid, gid, atime, mtime, ctime, mode, ino} = node;

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

    // User ID and group ID.
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
