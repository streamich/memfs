import process from './process';


const SEP = '/';


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

    constructor(parent: Node, name: string, isDirectory = false) {
        this.parent = parent;
        this.steps = parent ? parent.steps.concat([name]) : [name];
        this._isDirectory = isDirectory;
    }

    getChild(name: string) {
        return this.children[name];
    }

    createChild(name: string) {
        const node = new Node(this, name);
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
     * Walk the tree path and return the `Node` at that leaf.
     * @param steps
     * @param stop
     * @param i
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
 * Represents an open file (file descriptor) that points to a `Node` (inode).
 */
export class File {

    /**
     * Global file descriptor counter.
     * @type {number}
     */
    static fd = -128;

    /**
     * File descriptor, negative, because a real file descriptors cannot be negative.
     * This makes sure we don't ever conflict with real file descriptors, but there is
     * a good chance that it is a bad idea, because we conflict (kinda) with error messages,
     * which are negative. UNIX error codes normally are in range [-127...-1], we make sure
     * our file descriptors are less than -128 here.
     * @type {number}
     */
    fd: number = File.fd--;

    /**
     * Reference to an i-node.
     * @type {Node}
     */
    node: Node = null;

    /**
     * A cursor/offset position in a file, where data will be written on write.
     * User can "seek" this position.
     */
    offset: number = 0;


    constructor(node: Node) {
        this.node = node;
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
