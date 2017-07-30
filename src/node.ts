import {resolve} from 'path';
import process from './process';
import {Layer} from "./volume";


/**
 * Node in file system (like i-node, file, directory).
 */
export class Node {

    /**
     * Global file descriptor counter.
     * @type {number}
     */
    static fd = -128;

    // Layer where file is to be found.
    layer: Layer;

    // Relative path inside a layer.
    relative: string;

    // Absolute path.
    path: string;

    /**
     * File descriptor, negative, because a real file descriptors cannot be negative.
     * This makes sure we don't ever conflict with real file descriptors, but there is
     * a good chance that it is a bad idea, because we conflict (kinda) with error messages,
     * which are negative. UNIX error codes normally are in range [-127...-1], we make sure
     * our file descriptors are less than -128 here.
     * @type {number}
     */
    fd: number = Node.fd--;

    // User ID and group ID.
    uid: number = process.getuid();
    gid: number = process.getgid();

    atime = new Date;
    mtime = new Date;
    ctime = new Date;


    constructor(relative: string, layer: Layer) {
        this.relative = relative;
        this.path = resolve(layer.mountpoint, relative);
        this.layer = layer;
    }

    getData(): string {
        return '';
    }

    setData(data: string|Buffer) {

    }

    getPath() {
        return this.path;
    }


    stats(): Stats {
        return Stats.build(this);
    }

    chown(uid: number, gid: number) {
        this.uid = uid;
        this.gid = gid;
    }
}


/**
 * Represents a file.
 */
export class File extends Node {

    // A "cursor" position in a file, where data will be written.
    position: number = 0;

    getData(): string {
        return this.layer.files[this.relative];
    }

    setData(data: string|Buffer) {
        this.layer.files[this.relative] = data.toString();
    }

    truncate(len = 0) {
        this.setData(this.getData().substr(0, len));
    }
}


/**
 * Represents a directory.
 */
export class Directory extends Node {

}


/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export class Stats {

    static build(node: Node|File|Directory) {
        var stats = new Stats;

        stats.uid = node.uid;
        stats.gid = node.gid;

        stats.atime = node.atime;
        stats.mtime = node.mtime;
        stats.ctime = node.ctime;

        if(node instanceof Directory) {
            stats._isDirectory = true;
        } else if(node instanceof File) {
            var data = node.getData();
            stats.size = data.length;
            stats._isFile = true;
        }
        return stats;
    }


    // User ID and group ID.
    uid = process.getuid();
    gid = process.getgid();


    rdev = 0;
    blksize = 4096;
    ino = 0;
    size = 0;
    blocks = 1;

    atime = new Date;
    mtime = new Date;
    ctime = new Date;
    birthtime = new Date;

    dev = 0;
    mode = 0;
    nlink = 0;

    // For internal usage.
    _isFile = false;
    _isDirectory = false;

    isFile() {
        return this._isFile;
    }

    isDirectory() {
        return this._isDirectory;
    }

    isSymbolicLink() {
        return false;
    }
}
