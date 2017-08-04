import process from './process';
import {TMode} from "./volume";


export const SEP = '/';


/**
 * Node in a file system (like i-node, v-node).
 */
export class Node {

    parent: Node = null;

    children: {[child: string]: Node} = {};

    steps: string[] = [];

    // User ID and group ID.
    uid: number = process.getuid();
    gid: number = process.getgid();

    atime = new Date;
    mtime = new Date;
    ctime = new Date;

    data: string = '';

    private _isDirectory = false;
    private _isSymlink = false;

    mode = 0o666;

    constructor(parent: Node, name: string, isDirectory: boolean = false, mode: number = 0o666) {
        this.parent = parent;
        this.steps = parent ? parent.steps.concat([name]) : [name];
        this._isDirectory = isDirectory;
        this.mode = mode;
    }

    getChild(name: string) {
        return this.children[name];
    }

    createChild(name: string, isDirectory?: boolean, mode?: number) {
        const node = new Node(this, name, isDirectory, mode);
        this.children[name] = node;
        return node;
    }

    getPath() {
        return SEP + this.steps.join(SEP);
    }

    getData(): string {
        return this.data;
    }

    setData(data: string|Buffer) {
        this.data = String(data);
    }

    isDirectory() {
        return this._isDirectory;
    }

    isSymlink() {
        return this._isSymlink;
    }

    chown(uid: number, gid: number) {
        this.uid = uid;
        this.gid = gid;
    }

    /**
     * Walk the tree path and return the `Node` at that location, if any.
     * @param steps {string[]} Desired location.
     * @param stop {number} Max steps to go into.
     * @param i {number} Current step in the `steps` array.
     * @returns {any}
     */
    walk(steps: string[], stop: number = steps.length, i: number = 0) {
        if(i >= steps.length) return this;
        if(i >= stop) return this;

        const step = steps[i];
        const node = this.getChild(step);
        if(!node) return null;
        return node.walk(steps, stop, i + 1);
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

    fd: number = File.fd--;

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

    constructor(node: Node, flags: number) {
        this.node = node;
        this.flags = flags;
    }

    getData(): string {
        return this.node.getData();
    }

    setData(data: string|Buffer) {
        this.node.setData(data);
    }

    truncate(len = 0) {
        this.setData(this.getData().substr(0, len));
    }

    seek(offset: number) {
        this.offset = offset;
    }

    stats(): Stats {
        return Stats.build(this);
    }
}


/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats {

    static build(fd: File) {
        const stats = new Stats;
        const {node} = fd;

        stats.uid = node.uid;
        stats.gid = node.gid;

        stats.atime = node.atime;
        stats.mtime = node.mtime;
        stats.ctime = node.ctime;

        stats.size = node.getData().length;

        if(node.isDirectory())      stats._isDirectory = true;
        else if(node.isSymlink())   stats._isSymbolicLink = true;
        else                        stats._isFile = true;

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

    dev: number = 0;
    mode: number = 0;
    nlink: number = 0;

    // For internal usage.
    _isFile = false;
    _isDirectory = false;
    _isSymbolicLink = false;

    isFile() {
        return this._isFile;
    }

    isDirectory() {
        return this._isDirectory;
    }

    isSymbolicLink() {
        return this._isSymbolicLink;
    }
}
