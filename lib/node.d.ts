/// <reference types="node" />
import { Volume } from "./volume";
import { EventEmitter } from "events";
export declare const SEP = "/";
/**
 * Node in a file system (like i-node, v-node).
 */
export declare class Node extends EventEmitter {
    ino: number;
    uid: number;
    gid: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    buf: Buffer;
    perm: number;
    mode: number;
    nlink: number;
    symlink: string[];
    constructor(ino: number, perm?: number);
    getString(encoding?: string): string;
    setString(str: string): void;
    getBuffer(): Buffer;
    setBuffer(buf: Buffer): void;
    getSize(): number;
    setModeProperty(property: number): void;
    setIsFile(): void;
    setIsDirectory(): void;
    setIsSymlink(): void;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymlink(): boolean;
    makeSymlink(steps: string[]): void;
    write(buf: Buffer, off?: number, len?: number, pos?: number): number;
    read(buf: Buffer | Uint8Array, off?: number, len?: number, pos?: number): number;
    truncate(len?: number): void;
    chmod(perm: number): void;
    chown(uid: number, gid: number): void;
    touch(): void;
    canRead(uid?: number, gid?: number): boolean;
    canWrite(uid?: number, gid?: number): boolean;
}
/**
 * Represents a hard link that points to an i-node `node`.
 */
export declare class Link extends EventEmitter {
    vol: Volume;
    parent: Link;
    children: {
        [child: string]: Link;
    };
    steps: string[];
    node: Node;
    ino: Number;
    length: number;
    constructor(vol: Volume, parent: Link, name: string);
    setNode(node: Node): void;
    getNode(): Node;
    createChild(name: string, node?: Node): Link;
    setChild(name: string, link?: Link): Link;
    deleteChild(link: Link): void;
    getChild(name: string): Link;
    getPath(): string;
    getName(): string;
    /**
     * Walk the tree path and return the `Link` at that location, if any.
     * @param steps {string[]} Desired location.
     * @param stop {number} Max steps to go into.
     * @param i {number} Current step in the `steps` array.
     * @returns {any}
     */
    walk(steps: string[], stop?: number, i?: number): Link;
}
/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 */
export declare class File {
    /**
     * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
     * up, so here, in order not to conflict with them, we choose some big number and descrease
     * the file descriptor of every new opened file.
     * @type {number}
     */
    static fd: number;
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
    flags: number;
    /**
     * Open a Link-Node pair. `node` is provided separately as that might be a different node
     * rather the one `link` points to, because it might be a symlink.
     * @param link
     * @param node
     * @param flags
     * @param fd
     */
    constructor(link: Link, node: Node, flags: number, fd: number);
    getString(encoding?: string): string;
    setString(str: string): void;
    getBuffer(): Buffer;
    setBuffer(buf: Buffer): void;
    getSize(): number;
    truncate(len?: number): void;
    seekTo(position: number): void;
    stats(): Stats;
    write(buf: Buffer, offset?: number, length?: number, position?: number): number;
    read(buf: Buffer | Uint8Array, offset?: number, length?: number, position?: number): number;
    chmod(perm: number): void;
    chown(uid: number, gid: number): void;
}
/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
export declare class Stats {
    static build(node: Node): Stats;
    uid: number;
    gid: number;
    rdev: number;
    blksize: number;
    ino: number;
    size: number;
    blocks: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    dev: number;
    mode: number;
    nlink: number;
    private _checkModeProperty(property);
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
