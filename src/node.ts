import process from './process';
import {constants} from "./constants";
import {Volume} from "./volume";
const {S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK} = constants;


export const SEP = '/';


/**
 * Node in a file system (like i-node, v-node).
 */
export class Node {
    // i-node number.
    ino: number;

    // parent: Node = null;
    //
    // children: {[child: string]: Node} = {};
    //
    // steps: string[] = [];

    // User ID and group ID.
    uid: number = process.getuid();
    gid: number = process.getgid();

    atime = new Date;
    mtime = new Date;
    ctime = new Date;

    // data: string = '';
    buf: Buffer = null;

    perm = 0o666;

    mode = S_IFREG; // S_IFDIR, S_IFREG, etc.. (file by default?)

    // Number of hard links pointing at this Node.
    nlink = 0;

    // Steps to another node, if this node is a symlink.
    symlink: string[] = null;

    constructor(ino: number, perm: number = 0o666) {
        this.perm = perm;
        this.ino = ino;
    }
/*

    getChild(name: string) {
        return this.children[name];
    }
*/

/*    createChild(name: string, isDirectory?: boolean, perm?: number) {
        const node = new Node(this, name, isDirectory, perm);
        this.children[name] = node;
        return node;
    }*/

    getString(encoding = 'utf8'): string {
        return this.getBuffer().toString(encoding);
    }

    setString(str: string) {
        // this.setBuffer(Buffer.from(str, 'utf8'));
        this.buf = Buffer.from(str, 'utf8');
    }

    getBuffer(): Buffer {
        if(!this.buf) this.setBuffer(Buffer.from([]));
        return Buffer.from(this.buf); // Return a copy.
    }

    setBuffer(buf: Buffer) {
        this.buf = Buffer.from(buf); // Creates a copy of data.
    }/*

    getPath() {
        return SEP + this.steps.join(SEP);
    }

    getName(): string {
        return this.steps[this.steps.length - 1];
    }

    getFilename(): string {
        return this.steps.join(SEP);
    }*/

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

    chown(uid: number, gid: number) {
        this.uid = uid;
        this.gid = gid;
    }
/*
    /!**
     * Walk the tree path and return the `Node` at that location, if any.
     * @param steps {string[]} Desired location.
     * @param stop {number} Max steps to go into.
     * @param i {number} Current step in the `steps` array.
     * @returns {any}
     *!/
    walk(steps: string[], stop: number = steps.length, i: number = 0): Node {
        if(i >= steps.length) return this;
        if(i >= stop) return this;

        const step = steps[i];
        const node = this.getChild(step);
        if(!node) return null;
        return node.walk(steps, stop, i + 1);
    }*/
}


/**
 * Represents a hard link that points to an i-node `node`.
 */
export class Link {

    vol: Volume;

    parent: Link = null;

    children: {[child: string]: Link} = {};

    // Path to this node as Array: ['usr', 'bin', 'node'].
    steps: string[] = [];

    // "i-node" of this hard link.
    node: Node = null;

    // "i-node" number of the node.
    ino: Number = 0;

    constructor(vol: Volume, parent: Link, name: string) {
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
            link.setChild('.', link);
            link.getNode().nlink++;

            link.setChild('..', this);
            this.getNode().nlink++;
        }

        this.setChild(name, link);

        return link;
    }

    setChild(name: string, link: Link = new Link(this.vol, this, name)): Link {
        this.children[name] = link;
        link.parent = this;
        return link;
    }

    deleteChild(link: Link) {
        delete this.children[link.getName()];
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
}


/**
 * Represents an open file (file descriptor) that points to a `Node` (i-node/v-node).
 */
export class File {

    /**
     * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
     * up, so here, in order not to conflict with them, we choose some big number and descrease
     * the file descriptor of every new opened file.
     * @type {number}
     */
    static fd = 0xFFFFFFFF;

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
    offset: number = 0;

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
    constructor(link: Link, node: Node, flags: number, fd?: number) {
        this.link = link;
        this.node = node;
        this.flags = flags;
        if(!fd) this.fd = File.fd--;
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

    truncate(len = 0) {
        this.setString(this.getString().substr(0, len));
    }

    seek(offset: number) {
        this.offset = offset;
    }

    stats(): Stats {
        return Stats.build(this.node);
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
    nlink: number = 1;

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
