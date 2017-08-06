import {resolve, normalize, sep, relative, dirname} from 'path';
import {Node, Link, File, Stats} from "./node";
import {Buffer} from 'buffer';
import setImmediate from './setImmediate';
import process from './process';
const extend = require('fast-extend');
const errors = require('./internal/errors');



// ---------------------------------------- Types

// Node-style errors with a `code` property.
interface IError extends Error {
    code?: string,
}

export type TFilePath = string | Buffer | URL;
export type TFileId = TFilePath | number;           // Number is used as a file descriptor.
export type TDataOut = string | Buffer;             // Data formats we give back to users.
export type TData = TDataOut | Uint8Array;          // Data formats users can give us.
export type TFlags = string | number;
export type TMode = string | number;                // Mode can be a String, although docs say it should be a Number.
export type TEncoding = 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'latin1' | 'binary' | 'hex';
export type TEncodingExtended = TEncoding | 'buffer';
export type TTime = number | string | Date;
export type TCallback<TData> = (error?: IError, data?: TData) => void;



// ---------------------------------------- Constants

import {constants} from "./constants";
const {O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_NOCTTY, O_TRUNC, O_APPEND,
    O_DIRECTORY, O_NOATIME, O_NOFOLLOW, O_SYNC, O_DIRECT, O_NONBLOCK,
    F_OK, R_OK, W_OK, X_OK} = constants;

const ENCODING_UTF8: TEncoding = 'utf8';

// Default modes for opening files.
const enum MODE {
    FILE = 0o666,
    DIR  = 0o777,
    DEFAULT = MODE.FILE,
}



// ---------------------------------------- Error messages

// TODO: Use `internal/errors.js` in the future.

const ERRSTR = {
    PATH_STR:       'path must be a string or Buffer',
    FD:             'file descriptor must be a unsigned 32-bit integer',
    MODE_INT:       'mode must be an int',
    CB:             'callback must be a function',
    UID:            'uid must be an unsigned int',
    GID:            'gid must be an unsigned int',
    LEN:            'len must be an integer',
    ATIME:          'atime must be an integer',
    MTIME:          'mtime must be an integer',
    PREFIX:         'filename prefix is required',
    BUFFER:         'buffer must be an instance of Buffer or StaticBuffer',
    OFFSET:         'offset must be an integer',
    LENGTH:         'length must be an integer',
    POSITION:       'position must be an integer',
};
const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;
// const ERRSTR_FLAG = flag => `Unknown file open flag: ${flag}`;

const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EPERM = 'EPERM';
const EPROTO = 'EPROTO';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';

function formatError(errorCode: string, func = '', path = '', path2 = '') {

    let pathFormatted = '';
    if(path) pathFormatted = ` '${path}'`;
    if(path2) pathFormatted += ` -> '${path2}'`;

    switch(errorCode) {
        case ENOENT:      return `ENOENT: no such file or directory, ${func}${pathFormatted}`;
        case EBADF:       return `EBADF: bad file descriptor, ${func}${pathFormatted}`;
        case EINVAL:      return `EINVAL: invalid argument, ${func}${pathFormatted}`;
        case EPERM:       return `EPERM: operation not permitted, ${func}${pathFormatted}`;
        case EPROTO:      return `EPROTO: protocol error, ${func}${pathFormatted}`;
        case EEXIST:      return `EEXIST: file already exists, ${func}${pathFormatted}`;
        case ENOTDIR:     return `ENOTDIR: not a directory, ${func}${pathFormatted}`;
        case EISDIR:      return `EISDIR: illegal operation on a directory, ${func}${pathFormatted}`;
        case EACCES:      return `EACCES: permission denied, ${func}${pathFormatted}`;
        case ENOTEMPTY:   return `ENOTEMPTY: directory not empty, ${func}${pathFormatted}`;
        case EMFILE:      return `EMFILE: too many open files, ${func}${pathFormatted}`;
        default:          return `${errorCode}: error occurred, ${func}${pathFormatted}`;
    }
}

function createError(errorCode: string, func = '', path = '', path2 = '', Constructor = Error) {
    const error = new Constructor(formatError(errorCode, func, path, path2));
    (error as any).code = errorCode;
    return error;
}

function throwError(errorCode: string, func = '', path = '', path2 = '', Constructor = Error) {
    throw createError(errorCode, func, path, path2, Constructor);
}


// ---------------------------------------- File identifier checking

function pathOrError(path: TFilePath, encoding?: TEncoding): string | TypeError {
    if(Buffer.isBuffer(path)) path = (path as Buffer).toString(encoding);
    if(typeof path !== 'string') return TypeError(ERRSTR.PATH_STR);
    return path as string;
}

function validPathOrThrow(path: TFilePath, encoding?): string {
    const p = pathOrError(path, encoding);
    if(p instanceof TypeError) throw p;
    else return p as string;
}

function assertFd(fd: number) {
    if(typeof fd !== 'number') throw TypeError(ERRSTR.FD);
}



// ---------------------------------------- Flags

// List of file `flags` as defined by Node.
export enum FLAGS {
    // Open file for reading. An exception occurs if the file does not exist.
    r       = O_RDONLY,
    // Open file for reading and writing. An exception occurs if the file does not exist.
    'r+'    = O_RDWR,
    // Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache.
    rs      = O_RDONLY | O_SYNC,
    sr      = FLAGS.rs,
    // Open file for reading and writing, telling the OS to open it synchronously. See notes for 'rs' about using this with caution.
    'rs+'   = O_RDWR | O_SYNC,
    'sr+'   = FLAGS['rs+'],
    // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
    w       = O_WRONLY | O_CREAT | O_TRUNC,
    // Like 'w' but fails if path exists.
    wx      = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL,
    xw      = FLAGS.wx,
    // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
    'w+'    = O_RDWR | O_CREAT | O_TRUNC,
    // Like 'w+' but fails if path exists.
    'wx+'   = O_RDWR | O_CREAT | O_TRUNC | O_EXCL,
    'xw+'   = FLAGS['wx+'],
    // Open file for appending. The file is created if it does not exist.
    a       = O_WRONLY | O_APPEND | O_CREAT,
    // Like 'a' but fails if path exists.
    ax      = O_WRONLY | O_APPEND | O_CREAT | O_EXCL,
    xa      = FLAGS.ax,
    // Open file for reading and appending. The file is created if it does not exist.
    'a+'    = O_RDWR | O_APPEND | O_CREAT,
    // Like 'a+' but fails if path exists.
    'ax+'   = O_RDWR | O_APPEND | O_CREAT | O_EXCL,
    'xa+'   = FLAGS['ax+'],
}

export function flagsToNumber(flags: TFlags): number {
    if(typeof flags === 'number') return flags;

    if(typeof flags === 'string') {
        const flagsNum = FLAGS[flags];
        if(typeof flagsNum !== 'undefined') return flagsNum;
    }

    // throw new TypeError(formatError(ERRSTR_FLAG(flags)));
    throw new errors.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
}




// ---------------------------------------- Options

function assertEncoding(encoding: string) {
    if(encoding && !Buffer.isEncoding(encoding))
        throw Error('Unknown encoding: ' + encoding);
}

function getOptions <T> (defaults: T, options?: T|string): T {
    if(!options) return defaults;
    else {
        var tipeof = typeof options;
        switch(tipeof) {
            case 'string': return extend({}, defaults, {encoding: options as string});
            case 'object': return extend({}, defaults, options);
            default: throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }
}

function optsGenerator<TOpts>(defaults: TOpts): (opts) => TOpts {
    return options => getOptions(defaults, options);
}

function validateCallback(callback) {
    if(typeof callback !== 'function')
        throw TypeError(ERRSTR.CB);
    return callback;
}

function optsAndCbGenerator<TOpts, TResult>(getOpts): (options, callback?) => [TOpts, TCallback<TResult>] {
    return (options, callback?) => typeof options === 'function'
        ? [getOpts(), options]
        : [getOpts(options), validateCallback(callback)];
}

// General options with optional `encoding` property that most commands accept.
export interface IOptions {
    encoding?: TEncoding;
}

export interface IFileOptions extends IOptions {
    mode?: TMode;
    flag?: TFlags;
}

const optsDefaults: IOptions = {
    encoding: 'utf8',
};
const getDefaultOpts = optsGenerator<IOptions>(optsDefaults);
const getDefaultOptsAndCb = optsAndCbGenerator<IOptions, any>(getDefaultOpts);


// Options for `fs.readFile` and `fs.readFileSync`.
export interface IReadFileOptions extends IOptions {
    flag?: string;
}
const readFileOptsDefaults: IReadFileOptions = {
    flag: 'r',
};
const getReadFileOptions = optsGenerator<IReadFileOptions>(readFileOptsDefaults);


// Options for `fs.writeFile` and `fs.writeFileSync`
export interface IWriteFileOptions extends IFileOptions {}
const writeFileDefaults: IWriteFileOptions = {
    encoding: 'utf8',
    mode: MODE.DEFAULT,
    flag: FLAGS[FLAGS.w],
};
const getWriteFileOptions = optsGenerator<IWriteFileOptions>(writeFileDefaults);


// Options for `fs.appendFile` and `fs.appendFileSync`
export interface IAppendFileOptions extends IFileOptions {}
const appendFileDefaults: IAppendFileOptions = {
    encoding: 'utf8',
    mode: MODE.DEFAULT,
    flag: FLAGS[FLAGS.a],
};
const getAppendFileOptions = optsGenerator<IAppendFileOptions>(appendFileDefaults);


// Options for `fs.realpath` and `fs.realpathSync`
export interface IRealpathOptions {
    encoding?: TEncodingExtended,
}
const realpathDefaults: IReadFileOptions = optsDefaults;
const getRealpathOptions = optsGenerator<IRealpathOptions>(realpathDefaults);
const getRealpathOptsAndCb = optsAndCbGenerator<IRealpathOptions, TDataOut>(getRealpathOptions);





// ---------------------------------------- Utility functions

export function pathToFilename(path: TFilePath): string {

    // TODO: Add support for the new URL object.

    if((typeof path !== 'string') && !Buffer.isBuffer(path))
        throw new TypeError(ERRSTR.PATH_STR);

    const pathString = String(path);
    nullCheck(pathString);
    return pathString;
}

export function filenameToSteps(filename: string, base: string = process.cwd()): string[] {
    const fullPath = resolve(base, filename);
    const fullPathSansSlash = fullPath.substr(1);
    if(!fullPathSansSlash) return [];
    return fullPathSansSlash.split(sep);
}

export function pathToSteps(path: TFilePath): string[] {
    return filenameToSteps(pathToFilename(path));
}

export function dataToStr(data: TData, encoding: string = ENCODING_UTF8): string {
    if(Buffer.isBuffer(data)) return data.toString(encoding);
    else if(data instanceof Uint8Array) return Buffer.from(data).toString(encoding);
    else return String(data);
}

export function dataToBuffer(data: TData, encoding: string = ENCODING_UTF8): Buffer {
    if(Buffer.isBuffer(data)) return data;
    else if(data instanceof Uint8Array) return Buffer.from(data);
    else return Buffer.from(String(data), encoding);
}

export function strToEncoding(str: string, encoding?: TEncodingExtended): TDataOut {
    if(!encoding || (encoding === ENCODING_UTF8)) return str;           // UTF-8
    if(encoding === 'buffer') return new Buffer(str);                   // `buffer` encoding
    return (new Buffer(str)).toString(encoding);                        // Custom encoding
}

export function bufferToEncoding(buffer: Buffer, encoding?: TEncodingExtended): TDataOut {
    if(!encoding || (encoding === 'buffer')) return buffer;
    else return buffer.toString(encoding);
}

// function flagsToFlagsValue(f: string|number): number {
//     if(typeof f === 'number') return f;
//     if(typeof f !== 'string') throw TypeError(`flags must be string or number`);
//     var flagsval = flags[f] as any as number;
//     if(typeof flagsval !== 'number') throw TypeError(`Invalid flags string value '${f}'`);
//     return flagsval;
// }

function nullCheck(path, callback?) {
    if(('' + path).indexOf('\u0000') !== -1) {
        const er = new Error('Path must be a string without null bytes');
        (er as any).code = 'ENOENT';
        if(typeof callback !== 'function')
            throw er;
        process.nextTick(callback, er);
        return false;
    }
    return true;
}

function _modeToNumber(mode: TMode, def?): number {
    if(typeof mode === 'number') return mode;
    if(typeof mode === 'string') return parseInt(mode, 8);
    if(def) return modeToNumber(def);
    return undefined;
}

function modeToNumber(mode: TMode, def?): number {
    const result = _modeToNumber(mode, def);
    if((typeof result !== 'number') || isNaN(result))
        throw new TypeError(ERRSTR.MODE_INT);
    return result;
}

function isFd(path): boolean {
    return (path >>> 0) === path;
}

// converts Date or number to a fractional UNIX timestamp
function toUnixTimestamp(time) {
    if(typeof time === 'string' && (+time == (time as any))) {
        return +time;
    }
    if(isFinite(time)) {
        if (time < 0) {
            return Date.now() / 1000;
        }
        return time;
    }
    if(time instanceof Date) {
        return time.getTime() / 1000;
    }
    throw new Error('Cannot parse time: ' + time);
}

/**
 * Returns optional argument and callback
 * @param arg Argument or callback value
 * @param callback Callback or undefined
 * @param def Default argument value
 */
function getArgAndCb<TArg, TRes>(arg: TArg | TCallback<TRes>, callback?: TCallback<TRes>, def?: TArg): [TArg, TCallback<TRes>] {
    return typeof arg === 'function'
        ? [def, arg]
        : [arg, callback];
}

function validateUid(uid: number) {
    if(typeof uid !== 'number') throw TypeError(ERRSTR.UID);
}

function validateGid(gid: number) {
    if(typeof gid !== 'number') throw TypeError(ERRSTR.GID);
}




// ---------------------------------------- Volume

/**
 * `Volume` represents a file system.
 */
export class Volume {

    // I-node number counter.
    static ino: number = 0;

    // File descriptor counter.
    static fd: number = 0xFFFFFFFF;

    // Constructor function used to create new nodes.
    // NodeClass: new (...args) => TNode = Node as new (...args) => TNode;

    // Hard link to the root of this volume.
    // root: Node = new (this.NodeClass)(null, '', true);
    root: Link;

    // A mapping for i-node numbers to i-nodes (`Node`);
    inodes: {[ino: number]: Node} = {};

    // List of released i-node number, for reuse.
    releasedInos: number[] = [];

    // A mapping for file descriptors to `File`s.
    fds: {[fd: number]: File} = {};

    // A list of reusable (opened and closed) file descriptors, that should be
    // used first before creating a new file descriptor.
    releasedFds = [];

    // Max number of open files.
    maxFiles = 10000;

    // Current number of open files.
    openFiles = 0;

    constructor() {
        const root = new Link(this, null, '');
        root.setNode(this.createNode(true));

        // root.setChild('.', root);
        // root.getNode().nlink++;

        // root.setChild('..', root);
        // root.getNode().nlink++;

        this.root = root;
    }

    createLink(parent: Link, name: string, isDirectory: boolean = false, perm?: number): Link {
        return parent.createChild(name, this.createNode(isDirectory, perm));
    }

    deleteLink(link: Link): boolean {
        const parent = link.parent;
        if(parent) {
            parent.deleteChild(link);
            link.vol = null;
            link.parent = null;
            return true;
        }
        return false;
    }

    private newInoNumber(): number {
        if(this.releasedInos.length) return this.releasedInos.pop();
        else {
            Volume.ino = (Volume.ino++) % 0xFFFFFFFF;
            return Volume.ino;
        }
    }

    private newFdNumber(): number {
        return this.releasedFds.length ? this.releasedFds.pop() : Volume.fd--;
    }

    createNode(isDirectory: boolean = false, perm?: number): Node {
        const node = new Node(this.newInoNumber(), perm);
        if(isDirectory) node.setIsDirectory();
        this.inodes[node.ino] = node;
        return node;
    }

    private getNode(ino: number) {
        return this.inodes[ino];
    }

    private deleteNode(node: Node) {
        delete this.inodes[node.ino];
        this.releasedInos.push(node.ino);
    }

    // Generates 6 character long random string, used by `mkdtemp`.
    genRndStr() {
        const str = (Math.random() + 1).toString(36).substr(2, 6);
        if(str.length === 6) return str;
        else return this.genRndStr();
    }

    // Returns a `Link` (hard link) referenced by path "split" into steps.
    getLink(steps: string[]): Link {
        return this.root.walk(steps);
    }

    // Just link `getLink`, but throws a correct user error, if link to found.
    private getLinkOrThrow(filename: string, funcName?: string): Link {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if(!link) throwError(ENOENT, funcName, filename);
        return link;
    }

    // Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
    private getResolvedLinkOrThrow(filename: string, funcName?: string): Link {
        let link = this.getLinkOrThrow(filename, funcName);
        link = this.resolveSymlinks(link);
        if(!link) throwError(ENOENT, funcName, filename);
        return link;
    }

    // Just like `getLinkOrThrow`, but also verifies that the link is a directory.
    private getLinkAsDirOrThrow(filename: string, funcName?: string): Link {
        const link = this.getLinkOrThrow(filename, funcName);
        if(!link.getNode().isDirectory())
            throwError(ENOTDIR, funcName, filename);
        return link;
    }

    // Get the immediate parent directory of the link.
    private getLinkParent(steps: string[]): Link {
        return this.root.walk(steps, steps.length - 1);
    }

    private getLinkParentAsDirOrThrow(filenameOrSteps: string | string[], funcName?: string): Link {
        const steps = filenameOrSteps instanceof Array ? filenameOrSteps : filenameToSteps(filenameOrSteps);
        const link = this.getLinkParent(steps);
        if(!link) throwError(ENOENT, funcName, sep + steps.join(sep));
        if(!link.getNode().isDirectory()) throwError(ENOTDIR, funcName, sep + steps.join(sep));
        return link;
    }

    resolveSymlinks(link: Link): Link {
        let node: Node = link.getNode();
        while(link && node.isSymlink()) {
            link = this.getLink(node.symlink);
            if(!link) return null;
            node = link.getNode();
        }
        return link;
    }

    private getFileByFd(fd: number): File {
        return this.fds[fd];
    }

    private getFileByFdOrThrow(fd: number, funcName?: string): File {
        if(!isFd(fd)) throw TypeError(ERRSTR.FD);
        const file = this.getFileByFd(fd);
        if(!file) throwError('EBADF', funcName);
        return file;
    }

    private getNodeByIdOrCreate(id: TFileId, flags: number, perm: number): Node {
        if(typeof id === 'number') {
            const file = this.getFileByFd(id);
            if(!file) throw Error('File nto found');
            return file.node;
        } else {
            const steps = pathToSteps(id as TFilePath);
            let link: Link = this.getLink(steps);
            if(link) return link.getNode();

            // Try creating a node if not found.
            if(flags & O_CREAT) {
                const dirLink = this.getLinkParent(steps);
                if(dirLink) {
                    const name = steps[steps.length - 1];
                    link = this.createLink(dirLink, name, false, perm);
                    return link.getNode();
                }
            }

            throwError('ENOENT', 'getNodeByIdOrCreate', pathToFilename(id))
        }
    }

    private wrapAsync(method: (...args) => void, args: any[], callback: TCallback<any>) {
        if(typeof callback !== 'function')
            throw Error(ERRSTR.CB);

        setImmediate(() => {
            try {
                callback(null, method.apply(this, args));
            } catch(err) {
                callback(err);
            }
        });
    }

    private _toJSON(link = this.root, json = {}) {
        for(let name in link.children) {
            let child = link.getChild(name);
            let node = child.getNode();
            if(node.isFile()) {
                json[child.getPath()] = node.getString();
            } else if(node.isDirectory()) {
                this._toJSON(child, json);
            }
        }
        return json;
    }

    toJSON() {
        return this._toJSON();
    }

    fromJSON(json: {[filename: string]: string}, cwd: string = '/') {
        for(let filename in json) {
            const data = json[filename];
            filename = resolve(cwd, filename);
            const steps = filenameToSteps(filename);
            if(steps.length > 1) {
                const dirname = sep + steps.slice(0, steps.length - 1).join(sep);
                this.mkdirpBase(dirname, MODE.DIR);
            }
            this.writeFileSync(filename, data);
        }
    }

    mountSync(mountpoint: string, json: {[filename: string]: string}) {
        const json2: {[filename: string]: string} = {};
        // this.importJSON(json);
    }

    private openLink(link: Link, flagsNum: number, resolveSymlinks: boolean = true): File {
        if(this.openFiles >= this.maxFiles) { // Too many open files.
            throw createError(EMFILE, 'open', link.getPath());
        }

        // Resolve symlinks.
        let realLink: Link = link;
        if(resolveSymlinks) realLink = this.resolveSymlinks(link);
        if(!realLink) throwError(ENOENT, 'open', link.getPath());

        const node = realLink.getNode();
        if(node.isDirectory())
            throwError(EISDIR, 'open', link.getPath());

        const file = new File(link, node, flagsNum, this.newFdNumber());
        this.fds[file.fd] = file;
        this.openFiles++;

        if(flagsNum & O_TRUNC) file.truncate();

        return file;
    }

    private openFile(fileName: string, flagsNum: number, modeNum: number, resolveSymlinks: boolean = true): File {
        const steps = filenameToSteps(fileName);
        let link: Link = this.getLink(steps);

        // Try creating a new file, if it does not exist.
        if(!link) {
            const dirLink: Link = this.getLinkParent(steps);
            if((flagsNum & O_CREAT) && (typeof modeNum === 'number')) {
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
        }

        if(link) return this.openLink(link, flagsNum, resolveSymlinks);
    }

    private openBase(filename: string, flagsNum: number, modeNum: number, resolveSymlinks: boolean = true): number {
        const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
        if(!file) throw createError('ENOENT', 'open', filename);
        return file.fd;
    }

    openSync(path: TFilePath, flags: TFlags, mode: TMode = MODE.DEFAULT): number {
        // Validate (1) mode; (2) path; (3) flags - in that order.
        const modeNum = modeToNumber(mode);
        const fileName = pathToFilename(path);
        const flagsNum = flagsToNumber(flags);
        return this.openBase(fileName, flagsNum, modeNum);
    }

    open(path: TFilePath, flags: TFlags, /* ... */                      callback: TCallback<number>);
    open(path: TFilePath, flags: TFlags, mode: TMode,                   callback: TCallback<number>);
    open(path: TFilePath, flags: TFlags, a: TMode|TCallback<number>,    b?: TCallback<number>) {
        let mode: TMode = a as TMode;
        let callback: TCallback<number> = b as TCallback<number>;

        if(typeof a === 'function') {
            mode = MODE.DEFAULT;
            callback = a;
        }

        const modeNum = modeToNumber(mode);
        const fileName = pathToFilename(path);
        const flagsNum = flagsToNumber(flags);

        this.wrapAsync(this.openBase, [fileName, flagsNum, modeNum], callback);
    }

    private closeFile(file: File) {
        if(!this.fds[file.fd]) return;

        this.openFiles--;
        delete this.fds[file.fd];
        this.releasedFds.push(file.fd);
    }

    closeSync(fd: number) {
        const file = this.getFileByFd(fd);
        if(!file) throwError('EBADF', 'close');
        this.closeFile(file);
    }

    close(fd: number, callback: TCallback<void>) {
        this.wrapAsync(this.closeSync, [fd], callback);
    }

    private openFileOrGetById(id: TFileId, flagsNum: number, modeNum?: number): File {
        if(typeof id === 'number') {
            const file = this.fds[id];
            if(!file)
                throw createError('ENOENT');
            return file;
        } else {
            return this.openFile(pathToFilename(id), flagsNum, modeNum);
        }
    }

    private readFileBase(id: TFileId, flagsNum: number, encoding: TEncoding): Buffer | string {
        let result: Buffer | string;
        if(typeof id === 'number') {
            const file = this.getFileByFd(id);
            if(!file) throw createError('ENOENT', 'readFile', String(id));
            result = bufferToEncoding(file.getBuffer(), encoding);
        } else {
            const fileName = pathToFilename(id);
            const file = this.openFile(fileName, flagsNum, 0);
            if(!file) throw createError('ENOENT', 'readFile', String(id));
            result = bufferToEncoding(file.getBuffer(), encoding);
            this.closeFile(file);
        }
        return result;
    }

    readFileSync(file: TFileId, options?: IReadFileOptions|string): TDataOut {
        const opts = getReadFileOptions(options);
        const flagsNum = flagsToNumber(opts.flag);
        return this.readFileBase(file, flagsNum, opts.encoding);
    }

    readFile(id: TFileId, callback: TCallback<TDataOut>);
    readFile(id: TFileId, options: IReadFileOptions|string,                 callback: TCallback<TDataOut>);
    readFile(id: TFileId, a: TCallback<TDataOut>|IReadFileOptions|string,   b?: TCallback<TDataOut>) {
        let options: IReadFileOptions|string = a;
        let callback: TCallback<TData> = b;

        if(typeof options === 'function') {
            callback = options;
            options = readFileOptsDefaults;
        }

        const opts = getReadFileOptions(options);
        const flagsNum = flagsToNumber(opts.flag);
        this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
    }

    writeSync(fd: number, buffer: Buffer | Uint8Array,      offset?: number,    length?: number,        position?: number): number;
    writeSync(fd: number, str: string,                      position?: number,  encoding?: TEncoding): number;
    writeSync(fd: number, a: string | Buffer | Uint8Array,  b?: number,         c?: number | TEncoding, d?: number): number {
        if(!isFd(fd)) throw TypeError(ERRSTR.FD);
        let encoding: TEncoding;

        let offset: number;
        let length: number;
        let position: number;

        if(typeof a !== 'string') {
            offset = b | 0;
            length = (c as number);
            position = d;
        } else {
            position = b;
            encoding = c as TEncoding;
        }

        const buf: Buffer = dataToBuffer(a, encoding);

        if(typeof a !== 'string') {
            if(typeof length === 'undefined') {
                length = buf.length;
            }
        } else {
            offset = 0;
            length = buf.length;
        }

        const file = this.getFileByFd(fd);
        // if(!file) throw Error(ERRSTR.FD);
        if(!file) throwError('ENOENT', 'write');

        return file.write(buf, offset, length, position);
    }

    // write(fd: number, buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, callback?: (err: IError, bytesWritten: number, buffer: Buffer) => void);

    private writeFileBase(id: TFileId, buf: Buffer, flagsNum: number, modeNum: number) {
        // console.log('writeFileBase', id, buf, flagsNum, modeNum);
        // const node = this.getNodeByIdOrCreate(id, flagsNum, modeNum);
        // node.setBuffer(buf);

        const isUserFd = typeof id === 'number';
        let fd: number;

        if(isUserFd) fd = id as number;
        else {
            fd = this.openBase(pathToFilename(id as TFilePath), flagsNum, modeNum);
            // fd = this.openSync(id as TFilePath, flagsNum, modeNum);
        }

        let offset = 0;
        let length = buf.length;
        let position = (flagsNum & O_APPEND) ? null : 0;
        try {
            while(length > 0) {
                let written = this.writeSync(fd, buf, offset, length, position);
                offset += written;
                length -= written;
                if(position !== null) position += written;
            }
        } finally {
            if(!isUserFd) this.closeSync(fd);
        }
    }

    writeFileSync(id: TFileId, data: TData, options?: IWriteFileOptions) {
        const opts = getWriteFileOptions(options);
        const flagsNum = flagsToNumber(opts.flag);
        const modeNum = modeToNumber(opts.mode);
        const buf = dataToBuffer(data, opts.encoding);
        this.writeFileBase(id, buf, flagsNum, modeNum);
    }

    writeFile(id: TFileId, data: TData, callback: TCallback<void>);
    writeFile(id: TFileId, data: TData, options: IWriteFileOptions|string,              callback: TCallback<void>);
    writeFile(id: TFileId, data: TData, a: TCallback<void>|IWriteFileOptions|string,    b?: TCallback<void>) {
        let options: IWriteFileOptions|string = a as IWriteFileOptions;
        let callback: TCallback<void> = b;

        if(typeof a === 'function') {
            options = writeFileDefaults;
            callback = a;
        }

        const opts = getWriteFileOptions(options);
        const flagsNum = flagsToNumber(opts.flag);
        const modeNum = modeToNumber(opts.mode);
        const buf = dataToBuffer(data, opts.encoding);
        this.wrapAsync(this.writeFileBase, [id, buf, flagsNum, modeNum], callback);
    }

    private linkBase(filename1: string, filename2: string) {
        const steps1 = filenameToSteps(filename1);
        const link1 = this.getLink(steps1);
        if(!link1) throwError('ENOENT', 'link', filename1, filename2);

        const steps2 = filenameToSteps(filename2);

        // Check new link directory exists.
        const dir2 = this.getLinkParent(steps2);
        if(!dir2) throwError('ENOENT', 'link', filename1, filename2);

        const name = steps2[steps2.length - 1];

        // Check if new file already exists.
        if(dir2.getChild(name))
            throwError('EEXIST', 'link', filename1, filename2);

        const node =link1.getNode();
        node.nlink++;
        dir2.createChild(name, node);
    }

    linkSync(existingPath: TFilePath, newPath: TFilePath) {
        const existingPathFilename = pathToFilename(existingPath);
        const newPathFilename = pathToFilename(newPath);
        this.linkBase(existingPathFilename, newPathFilename);
    }

    link(existingPath: TFilePath, newPath: TFilePath, callback: TCallback<void>) {
        const existingPathFilename = pathToFilename(existingPath);
        const newPathFilename = pathToFilename(newPath);
        this.wrapAsync(this.linkBase, [existingPathFilename, newPathFilename], callback);
    }

    private unlinkBase(filename: string) {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if(!link) throwError('ENOENT', 'unlink', filename);

        // TODO: Check if it is file, dir, other...

        if(link.length)
            throw Error('Dir not empty...');

        this.deleteLink(link);

        const node = link.getNode();
        node.nlink--;

        // When all hard links to i-node are deleted, remove the i-node, too.
        if(node.nlink <= 0) {
            this.deleteNode(node);
        }
    }

    unlinkSync(path: TFilePath) {
        const filename = pathToFilename(path);
        this.unlinkBase(filename);
    }

    unlink(path: TFilePath, callback: TCallback<void>) {
        const filename = pathToFilename(path);
        this.wrapAsync(this.unlinkBase, [filename], callback);
    }

    private symlinkBase(targetFilename: string, pathFilename: string): Link {
        const pathSteps = filenameToSteps(pathFilename);

        // Check if directory exists, where we about to create a symlink.
        const dirLink = this.getLinkParent(pathSteps);
        if(!dirLink) throwError('ENOENT', 'symlink', targetFilename, pathFilename);

        const name = pathSteps[pathSteps.length - 1];

        // Check if new file already exists.
        if(dirLink.getChild(name))
            throwError('EEXIST', 'symlink', targetFilename, pathFilename);

        // Create symlink.
        const symlink: Link = dirLink.createChild(name);
        symlink.getNode().makeSymlink(filenameToSteps(targetFilename));
        return symlink;
    }

    // `type` argument works only on Windows.
    symlinkSync(target: TFilePath, path: TFilePath, type?: 'file' | 'dir' | 'junction') {
        const targetFilename = pathToFilename(target);
        const pathFilename = pathToFilename(path);
        this.symlinkBase(targetFilename, pathFilename);
    }

    symlink(target: TFilePath, path: TFilePath, callback: TCallback<void>);
    symlink(target: TFilePath, path: TFilePath, type: 'file' | 'dir' | 'junction',                  callback: TCallback<void>);
    symlink(target: TFilePath, path: TFilePath, a: TCallback<void> | 'file' | 'dir' | 'junction',   b?: TCallback<void>) {
        let type: 'file' | 'dir' | 'junction' = a as 'file' | 'dir' | 'junction';
        let callback: TCallback<void> = b;

        if(typeof type === 'function') {
            type = 'file';
            callback = a as TCallback<void>;
        }

        const targetFilename = pathToFilename(target);
        const pathFilename = pathToFilename(path);
        this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
    }

    private realpathBase(filename: string, encoding: TEncodingExtended): TDataOut {
        const steps = filenameToSteps(filename);
        const link: Link = this.getLink(steps);
        // TODO: this check has to be perfomed by `lstat`.
        if(!link) throwError('ENOENT', 'realpath', filename);

        // Resolve symlinks.
        const realLink = this.resolveSymlinks(link);
        if(!realLink) throwError('ENOENT', 'realpath', filename);

        return strToEncoding(realLink.getPath(), encoding);
    }

    realpathSync(path: TFilePath, options?: IRealpathOptions): TDataOut {
        return this.realpathBase(pathToFilename(path), getRealpathOptions(options).encoding);
    }

    realpath(path: TFilePath, callback: TCallback<TDataOut>);
    realpath(path: TFilePath, options: IRealpathOptions | string,                   callback: TCallback<TDataOut>);
    realpath(path: TFilePath, a: TCallback<TDataOut> | IRealpathOptions | string,   b?: TCallback<TDataOut>) {
        const [opts, callback] = getRealpathOptsAndCb(a, b);
        const pathFilename = pathToFilename(path);
        this.wrapAsync(this.realpathBase, [pathFilename, opts.encoding], callback);
    }

    private lstatBase(filename: string): Stats {
        const link: Link = this.getLink(filenameToSteps(filename));
        if(!link) throwError('ENOENT', 'lstat', filename);
        return Stats.build(link.getNode());
    }

    lstatSync(path: TFilePath): Stats {
        return this.lstatBase(pathToFilename(path));
    }

    lstat(path: TFilePath, callback: TCallback<Stats>) {
        this.wrapAsync(this.lstatBase, [pathToFilename(path)], callback);
    }

    private statBase(filename: string): Stats {
        let link: Link = this.getLink(filenameToSteps(filename));
        if(!link) throwError('ENOENT', 'stat', filename);

        // Resolve symlinks.
        link = this.resolveSymlinks(link);
        if(!link) throwError('ENOENT', 'stat', filename);

        return Stats.build(link.getNode());
    }

    statSync(path: TFilePath): Stats {
        return this.statBase(pathToFilename(path));
    }

    stat(path: TFilePath, callback: TCallback<Stats>) {
        this.wrapAsync(this.statBase, [pathToFilename(path)], callback);
    }

    private fstatBase(fd: number): Stats {
        const file = this.getFileByFd(fd);
        if(!file) throwError('EBADF', 'fstat');
        return Stats.build(file.node);
    }

    fstatSync(fd: number): Stats {
        return this.fstatBase(fd);
    }

    fstat(fd: number, callback: TCallback<Stats>) {
        this.wrapAsync(this.fstatBase, [fd], callback);
    }

    private renameBase(oldPathFilename: string, newPathFilename: string) {
        const link: Link = this.getLink(filenameToSteps(oldPathFilename));
        if(!link) throwError('ENOENT', 'rename', oldPathFilename, newPathFilename);

        // TODO: Check if it is directory, if non-empty, we cannot move it, right?

        const newPathSteps = filenameToSteps(newPathFilename);

        // Check directory exists for the new location.
        const newPathDirLink: Link = this.getLinkParent(newPathSteps);
        if(!newPathDirLink) throwError('ENOENT', 'rename', oldPathFilename, newPathFilename);

        // TODO: Also treat cases with directories and symbolic links.
        // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html

        // Remove hard link from old folder.
        const oldLinkParent = link.parent;
        if(oldLinkParent) {
            oldLinkParent.deleteChild(link);
        }

        // Rename should overwrite the new path, if that exists.
        link.steps = newPathSteps;
        newPathDirLink.setChild(link.getName(), link);
    }

    renameSync(oldPath: TFilePath, newPath: TFilePath) {
        const oldPathFilename = pathToFilename(oldPath);
        const newPathFilename = pathToFilename(newPath);
        this.renameBase(oldPathFilename, newPathFilename);
    }

    rename(oldPath: TFilePath, newPath: TFilePath, callback: TCallback<void>) {
        const oldPathFilename = pathToFilename(oldPath);
        const newPathFilename = pathToFilename(newPath);
        this.wrapAsync(this.renameBase, [oldPathFilename, newPathFilename], callback);
    }

    private existsBase(filename: string): boolean {
        return !!this.statBase(filename);
    }

    existsSync(path: TFilePath): boolean {
        return this.existsBase(pathToFilename(path));
    }

    exists(path: TFilePath, callback: (exists: boolean) => void) {
        const filename = pathToFilename(path);

        if(typeof callback !== 'function')
            throw Error(ERRSTR.CB);

        setImmediate(() => {
            try {
                callback(this.existsBase(filename));
            } catch(err) {
                callback(false);
            }
        });
    }

    private accessBase(filename: string, mode: number) {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if(!link) throwError('ENOENT', 'access', filename);

        // TODO: Verify permissions
    }

    accessSync(path: TFilePath, mode: number = F_OK) {
        const filename = pathToFilename(path);
        mode = mode | 0;
        this.accessBase(filename, mode);
    }

    access(path: TFilePath, callback: TCallback<void>);
    access(path: TFilePath, mode: number,                   callback: TCallback<void>);
    access(path: TFilePath, a: TCallback<void> | number,    b?: TCallback<void>) {
        let mode: number = a as number;
        let callback: TCallback<void> = b;

        if(typeof mode === 'function') {
            mode = F_OK;
            callback = a as TCallback<void>;
        }

        const filename = pathToFilename(path);
        mode = mode | 0;

        this.wrapAsync(this.accessBase, [filename, mode], callback);
    }

    appendFileSync(id: TFileId, data: TData, options: IAppendFileOptions | string = appendFileDefaults) {
        const opts = getAppendFileOptions(options);

        // force append behavior when using a supplied file descriptor
        if (!opts.flag || isFd(id)) opts.flag = 'a';

        this.writeFileSync(id, data, opts);
    }

    private readdirBase(filename: string, encoding: TEncodingExtended): TDataOut[] {
        const steps = filenameToSteps(filename);
        const link: Link = this.getLink(steps);
        if(!link) throwError('ENOENT', 'readdir', filename);

        const node = link.getNode();
        if(!node.isDirectory())
            throwError('ENOTDIR', 'scandir', filename);

        const list: TDataOut[] = [];
        for(let name in link.children)
            list.push(strToEncoding(name, encoding));

        if(encoding !== 'buffer') list.sort();

        return list;
    }

    readdirSync(path: TFilePath, options?: IOptions | string): TDataOut[] {
        const opts = getDefaultOpts(options);
        const filename = pathToFilename(path);
        return this.readdirBase(filename, opts.encoding);
    }

    readdir(path: TFilePath, callback: TCallback<TDataOut[]>);
    readdir(path: TFilePath, options: IOptions | string,                        callback: TCallback<TDataOut[]>);
    readdir(path: TFilePath, a: TCallback<TDataOut[]> | IOptions | string,      b?: TCallback<TDataOut[]>) {
        let options: IOptions | string = a;
        let callback: TCallback<TDataOut[]> = b;

        if(typeof a === 'function') {
            callback = a;
            options = optsDefaults;
        }

        const opts = getDefaultOpts(options);
        const filename = pathToFilename(path);
        this.wrapAsync(this.readdirBase, [filename, opts.encoding], callback);
    }

    private readlinkBase(filename: string, encoding: TEncodingExtended): TDataOut {
        const link = this.getLinkOrThrow(filename, 'readlink');
        const node = link.getNode();

        if(!node.isSymlink()) throwError('EINVAL', 'readlink', filename);

        const str = sep + node.symlink.join(sep);
        return strToEncoding(str, encoding);
    }

    readlinkSync(path: TFilePath, options?: IOptions): TDataOut {
        const opts = getDefaultOpts(options);
        const filename = pathToFilename(path);
        return this.readlinkBase(filename, opts.encoding);
    }

    readlink(path: TFilePath, callback: TCallback<TDataOut>);
    readlink(path: TFilePath, options: IOptions, callback: TCallback<TDataOut>);
    readlink(path: TFilePath, a: TCallback<TDataOut> | IOptions, b?: TCallback<TDataOut>) {
        const [opts, callback] = getDefaultOptsAndCb(a, b);
        const filename = pathToFilename(path);
        this.wrapAsync(this.readlinkBase, [filename, opts.encoding], callback);
    }

    private fsyncBase(fd: number) {
        this.getFileByFdOrThrow(fd, 'fsync');
    }

    fsyncSync(fd: number) {
        this.fsyncBase(fd);
    }

    fsync(fd: number, callback: TCallback<void>) {
        this.wrapAsync(this.fsyncBase, [fd], callback);
    }

    private fdatasyncBase(fd: number) {
        this.getFileByFdOrThrow(fd, 'fdatasync');
    }

    fdatasyncSync(fd: number) {
        this.fdatasyncBase(fd);
    }

    fdatasync(fd: number, callback: TCallback<void>) {
        this.wrapAsync(this.fdatasyncBase, [fd], callback);
    }

    private ftruncateBase(fd: number, len?: number) {
        const file = this.getFileByFdOrThrow(fd, 'ftruncate');
        file.truncate(len);
    }

    ftruncateSync(fd: number, len?: number) {
        this.ftruncateBase(fd, len);
    }

    ftruncate(fd: number, callback: TCallback<void>);
    ftruncate(fd: number, len: number,                          callback: TCallback<void>);
    ftruncate(fd: number, a: TCallback<void> | number,          b?: TCallback<void>) {
        const [len, callback] = getArgAndCb<number, void>(a, b);
        this.wrapAsync(this.ftruncateBase, [fd, len], callback);
    }

    private truncateBase(path: TFilePath, len?: number) {
        const fd = this.openSync(path, 'r+');
        try {
            this.ftruncateSync(fd, len);
        } finally {
            this.closeSync(fd);
        }
    }

    truncateSync(id: TFileId, len?: number) {
        if(isFd(id))
            return this.ftruncateSync(id as number, len);

        this.truncateBase(id as TFilePath, len);
    }

    truncate(id: TFileId, callback: TCallback<void>);
    truncate(id: TFileId, len: number,                      callback: TCallback<void>);
    truncate(id: TFileId, a: TCallback<void> | number,      b?: TCallback<void>) {
        if(isFd(id))
            return this.ftruncate(id as number, a as any, b);

        const [len, callback] = getArgAndCb<number, void>(a, b, 0);
        this.wrapAsync(this.truncateBase, [id, len], callback);
    }

    private futimesBase(fd: number, atime: number, mtime: number) {
        const file = this.getFileByFdOrThrow(fd, 'futimes');
        const node = file.node;
        node.atime = new Date(atime * 1000);
        node.mtime = new Date(mtime * 1000);
    }

    futimesSync(fd: number, atime: TTime, mtime: TTime) {
        this.futimesBase(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
    }

    futimes(fd: number, atime: TTime, mtime: TTime, callback: TCallback<void>) {
        this.wrapAsync(this.futimesBase, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
    }

    private utimesBase(filename: string, atime: number, mtime: number) {
        const fd = this.openSync(filename, 'r+');
        try {
            this.futimesBase(fd, atime, mtime);
        } finally {
            this.closeSync(fd);
        }
    }

    utimesSync(path: TFilePath, atime: TTime, mtime: TTime) {
        this.utimesBase(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime));
    }

    utimes(path: TFilePath, atime: TTime, mtime: TTime, callback: TCallback<void>) {
        this.wrapAsync(this.utimesBase, [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
    }

    private mkdirBase(filename: string, modeNum: number) {
        const steps = filenameToSteps(filename);
        const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');

        // Check path already exists.
        const name = steps[steps.length - 1];
        if(dir.getChild(name)) throwError(EEXIST, 'mkdir', filename);

        dir.createChild(name, this.createNode(true, modeNum));
    }

    mkdirSync(path: TFilePath, mode?: TMode) {
        const modeNum = modeToNumber(mode, 0o777);
        const filename = pathToFilename(path);
        this.mkdirBase(filename, modeNum);
    }

    mkdir(path: TFilePath, callback: TCallback<void>);
    mkdir(path: TFilePath, mode: TMode,                     callback: TCallback<void>);
    mkdir(path: TFilePath, a: TCallback<void> | TMode,      b?: TCallback<void>) {
        const [mode, callback] = getArgAndCb<TMode, void>(a, b);
        const modeNum = modeToNumber(mode, 0o777);
        const filename = pathToFilename(path);
        this.wrapAsync(this.mkdirBase, [filename, modeNum], callback);
    }

    private mkdtempBase(prefix: string, encoding: TEncodingExtended, retry: number = 5): TDataOut {
        let filename = prefix + this.genRndStr();
        try {
            this.mkdirBase(filename, MODE.DIR);
            return strToEncoding(filename, encoding);
        } catch(err) {
            if(err.code === EEXIST) {
                if(retry > 1) this.mkdtempBase(prefix, encoding, retry - 1);
                else throw Error('Could not create temp dir.');
            } else throw err;
        }
    }

    mkdtempSync(prefix: string, options?: IOptions): TDataOut {
        const {encoding} = getDefaultOpts(options);

        if(!prefix || typeof prefix !== 'string')
            throw new TypeError('filename prefix is required');

        if(!nullCheck(prefix)) return;

        return this.mkdtempBase(prefix, encoding);
    }

    mkdtemp(prefix: string, callback: TCallback<void>);
    mkdtemp(prefix: string, options: IOptions,                  callback: TCallback<void>);
    mkdtemp(prefix: string, a: TCallback<void> | IOptions,      b?: TCallback<void>) {
        const [{encoding}, callback] = getDefaultOptsAndCb(a, b);

        if(!prefix || typeof prefix !== 'string')
            throw new TypeError('filename prefix is required');

        if(!nullCheck(prefix)) return;

        this.wrapAsync(this.mkdtempBase, [prefix, encoding], callback);
    }

    /**
     * Creates directory tree recursively.
     * @param filename
     * @param modeNum
     */
    private mkdirpBase(filename: string, modeNum: number) {
        const steps = filenameToSteps(filename);
        let link = this.root;
        for(let i = 0; i < steps.length; i++) {
            const step = steps[i];

            if(!link.getNode().isDirectory())
                throwError(ENOTDIR, 'mkdirp', link.getPath());

            const child = link.getChild(step);
            if(child) {
                if(child.getNode().isDirectory()) link = child;
                else throwError(ENOTDIR, 'mkdirp', child.getPath());
            } else {
                link = link.createChild(step, this.createNode(true, modeNum));
            }
        }
    }

    mkdirpSync(path: TFilePath, mode?: TMode) {
        const modeNum = modeToNumber(mode, 0o777);
        const filename = pathToFilename(path);
        this.mkdirpBase(filename, modeNum);
    }

    mkdirp(path: TFilePath, callback: TCallback<void>);
    mkdirp(path: TFilePath, mode: TMode, callback: TCallback<void>);
    mkdirp(path: TFilePath, a: TCallback<void> | TMode, b?: TCallback<void>) {
        const [mode, callback] = getArgAndCb<TMode, void>(a, b);
        const modeNum = modeToNumber(mode, 0o777);
        const filename = pathToFilename(path);
        this.wrapAsync(this.mkdirpBase, [filename, modeNum], callback);
    }

    private rmdirBase(filename: string) {
        const link = this.getLinkAsDirOrThrow(filename, 'rmdir');

        // Check directory is empty.
        if(link.length) throwError(ENOTEMPTY, 'rmdir', filename);

        this.deleteLink(link);
    }

    rmdirSync(path: TFilePath) {
        this.rmdirBase(pathToFilename(path));
    }

    rmdir(path: TFilePath, callback: TCallback<void>) {
        this.wrapAsync(this.rmdirBase, [pathToFilename(path)], callback);
    }

    private fchmodBase(fd: number, modeNum: number) {
        const file = this.getFileByFdOrThrow(fd, 'fchmod');
        file.chmod(modeNum);
    }

    fchmodSync(fd: number, mode: TMode) {
        this.fchmodBase(fd, modeToNumber(mode));
    }

    fchmod(fd: number, mode: TMode, callback: TCallback<void>) {
        this.wrapAsync(this.fchmodBase, [fd, modeToNumber(mode)], callback);
    }

    private chmodBase(filename: string, modeNum: number) {
        const fd = this.openSync(filename, 'r+');
        try {
            this.fchmodBase(fd, modeNum);
        } finally {
            this.closeSync(fd);
        }
    }

    chmodSync(path: TFilePath, mode: TMode) {
        const modeNum = modeToNumber(mode);
        const filename = pathToFilename(path);
        this.chmodBase(filename, modeNum);
    }

    chmod(path: TFilePath, mode: TMode, callback: TCallback<void>) {
        const modeNum = modeToNumber(mode);
        const filename = pathToFilename(path);
        this.wrapAsync(this.chmodBase, [filename, modeNum], callback);
    }

    private lchmodBase(filename: string, modeNum: number) {
        const fd = this.openBase(filename, O_RDWR, 0, false);
        try {
            this.fchmodBase(fd, modeNum);
        } finally {
            this.closeSync(fd);
        }
    }

    lchmodSync(path: TFilePath, mode: TMode) {
        const modeNum = modeToNumber(mode);
        const filename = pathToFilename(path);
        this.lchmodBase(filename, modeNum);
    }

    lchmod(path: TFilePath, mode: TMode, callback: TCallback<void>) {
        const modeNum = modeToNumber(mode);
        const filename = pathToFilename(path);
        this.wrapAsync(this.lchmodBase, [filename, modeNum], callback);
    }

    private fchownBase(fd: number, uid: number, gid: number) {
        this.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
    }

    fchownSync(fd: number, uid: number, gid: number) {
        validateUid(uid);
        validateGid(gid);
        this.fchownBase(fd, uid, gid);
    }

    fchown(fd: number, uid: number, gid: number, callback: TCallback<void>) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.fchownBase, [fd, uid, gid], callback);
    }

    private chownBase(filename: string, uid: number, gid: number) {
        const link = this.getResolvedLinkOrThrow(filename, 'chown');
        const node = link.getNode();
        node.chown(uid, gid);

        // if(node.isFile() || node.isSymlink()) {
        //
        // } else if(node.isDirectory()) {
        //
        // } else {
            // TODO: What do we do here?
        // }
    }

    chownSync(path: TFilePath, uid: number, gid: number) {
        validateUid(uid);
        validateGid(gid);
        this.chownBase(pathToFilename(path), uid, gid);
    }

    chown(path: TFilePath, uid: number, gid: number, callback: TCallback<void>) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.chownBase, [pathToFilename(path), uid, gid], callback);
    }

    private lchownBase(filename: string, uid: number, gid: number) {
        this.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
    }

    lchownSync(path: TFilePath, uid: number, gid: number) {
        validateUid(uid);
        validateGid(gid);
        this.lchownBase(pathToFilename(path), uid, gid);
    }

    lchown(path: TFilePath, uid: number, gid: number, callback: TCallback<void>) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.lchownBase, [pathToFilename(path), uid, gid], callback);
    }



/*

    addLayer(layer: Layer) {
        this.layers.push(layer);
        const mountpoint = resolve(layer.mountpoint) + sep;

        // Add the root dir at the mount point.
        this.addDir(mountpoint, layer);

        for(let relativePath in layer.files) {
            var filepath = relativePath.replace(/\//g, sep);
            var fullpath = mountpoint + filepath;
            this.addFile(fullpath, layer);
        }
    }

    getFilePath(p: string) {
        var filepath = resolve(p);
        var node = this.getNode(filepath);
        return node ? node : null;
    }

    getNode(p: string): Node {
        var filepath = resolve(p);
        var node = this.flattened[filepath];
        if(!node) throw this.err404(filepath);
        return node;
    }

    getFile(p: string): File {
        var node = this.getNode(p);
        if(node instanceof File) return node;

        throw this.err404(node.path);
    }

    getDirectory(p: string): Directory {
        var node = this.getNode(p);
        if(node instanceof Directory) return node;

        throw Error('Directory not found: ' + node.path);
    }

    getByFd(fd: number): Node {
        var node = this.fds[fd];
        if(node) return node;

        throw Error('Node file descriptor not found: ' + fd);
    }

    getLayerContainingPath(fullpath: string) {
        for(var i = 0; i < this.layers.length; i++) {
            var layer = this.layers[i];
            if(fullpath.indexOf(layer.mountpoint) === 0) return layer;
        }
        return null;
    }

    private err404(file) {
        return Error('File not found: ' + file);
    }

    /!**
     * Mount virtual in-memory files.
     * @param mountpoint Path to the root of the mounting point.
     * @param files A dictionary of relative file paths to their contents.
     *!/
    mountSync(mountpoint: string = '/', files: TLayerFiles = {}) {
        this.addLayer(new Layer(mountpoint, files));
    }

    // TODO: Mount from URL?
    // TODO: `mount('/usr/lib', 'http://example.com/volumes/usr/lib.json', callback)`
    // TODO: ...also cache that it has been loaded...
    mount(mountpoint: string, files: {[s: string] : string}|string, callback) {

    }



    // fs.readdirSync(path)
    readdirSync(p: string) {
        var fullpath = resolve(p);

        // Check the path points into at least one of the directories our layers are mounted to.
        var layer = this.getLayerContainingPath(fullpath);
        if(!layer) {
            throw Error('Directory not found: ' + fullpath);
        }

        // Check directory exists.
        try {
            var dir = this.getDirectory(fullpath);
        } catch(e) {
            throw Error(`ENOENT: no such file or directory, scandir '${fullpath}'`);
        }

        var len = fullpath.length;
        var index = {};
        for(var nodepath in this.flattened) {
            if(nodepath.indexOf(fullpath) === 0) { // Matches at the very beginning.
                try {
                    var node = this.getNode(nodepath);
                } catch(e) {
                    // This should never happen.
                    throw e;
                }

                let relativePath = nodepath.substr(len + 1);
                const sep_pos = relativePath.indexOf(sep);
                if(sep_pos > -1) relativePath = relativePath.substr(0, sep_pos);
                if(relativePath) index[relativePath] = 1;
            }
        }

        var files = [];
        for(var file in index) files.push(file);
        return files;
    }

    // fs.readdir(path, callback)
    readdir(p: string, callback) {
        setImmediate(() => {
            try {
                callback(null, this.readdirSync(p));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.appendFileSync(filename, data[, options])
    appendFileSync(filename, data, options?) {
        try {
            var file = this.getFile(filename);
            file.setData(file.getData() + data.toString());
        } catch(e) { // Try to create a new file.
            var fullpath = resolve(filename);
            var layer = this.getLayerContainingPath(fullpath);
            if(!layer) throw Error('Cannot create new file at this path: ' + fullpath);
            var file = this.addFile(fullpath, layer);
            file.setData(data.toString());
        }
    }

    // fs.appendFile(filename, data[, options], callback)
    appendFile(filename, data, options, callback?) {
        if(typeof options == 'function') {
            callback = options;
            options = null;
        }

        setImmediate(() => {
            try {
                this.appendFileSync(filename, data, options);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.unlinkSync(path)
    unlinkSync(filename) {
        var node = this.getNode(filename);
        delete node.layer.files[node.relative];
        delete this.flattened[node.path];
        delete this.fds[node.fd];
    }

    // fs.unlink(path, callback)
    unlink(filename, callback) {
        setImmediate(() => {
            try {
                this.unlinkSync(filename);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.truncateSync(path, len)
    truncateSync(filename, len) {
        var file = this.getFile(filename);
        file.truncate(len);
    }

    // fs.truncate(path, len, callback)
    truncate(filename, len, callback) {
        setImmediate(() => {
            try {
                this.truncateSync(filename, len);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.ftruncateSync(fd, len)
    ftruncateSync(fd, len) {
        const node = this.getByFd(fd) as File;
        if(!(node instanceof File)) this.err404((node as Node).path);
        node.truncate(len);
    }

    // fs.ftruncate(fd, len, callback)
    ftruncate(fd, len, callback) {
        setImmediate(() => {
            try {
                this.ftruncateSync(fd, len);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.chownSync(path, uid, gid)
    chownSync(filename, uid, gid) {
        var node = this.getNode(filename);
        node.chown(uid, gid);
    }

    // fs.chown(path, uid, gid, callback)
    chown(filename, uid, gid, callback) {
        setImmediate(() => {
            try {
                this.chownSync(filename, uid, gid);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.fchownSync(fd, uid, gid)
    fchownSync(fd: number, uid: number, gid: number) {
        var node = this.getByFd(fd);
        node.chown(uid, gid);
    }

    // fs.fchown(fd, uid, gid, callback)
    fchown(fd: number, uid: number, gid: number, callback?) {
        setImmediate(() => {
            try {
                this.fchownSync(fd, uid, gid);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.lchownSync(path, uid, gid)
    lchownSync(filename, uid, gid) {
        this.chownSync(filename, uid, gid);
    }

    // fs.lchown(path, uid, gid, callback)
    lchown(filename, uid, gid, callback) {
        this.chown(filename, uid, gid, callback);
    }

    // fs.chmodSync(path, mode)
    chmodSync(filename: string, mode) {
        this.getNode(filename); // Does nothing, but throws if `filename` does not resolve to a node.
    }

    // fs.chmod(filename, mode, callback)
    chmod(filename: string, mode, callback?) {
        setImmediate(() => {
            try {
                this.chmodSync(filename, mode);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.fchmodSync(fd, mode)
    fchmodSync(fd: number, mode) {
        this.getByFd(fd);
    }

    // fs.fchmod(fd, mode, callback)
    fchmod(fd: number, mode, callback) {
        setImmediate(() => {
            try {
                this.fchmodSync(fd, mode);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.lchmodSync(path, mode)
    lchmodSync(filename, mode) {
        this.chmodSync(filename, mode);
    }

    // fs.lchmod(path, mode, callback)
    lchmod(filename, mode, callback) {
        this.chmod(filename, mode, callback);
    }

    // fs.rmdirSync(path)
    rmdirSync(p: string) {
        var dir = this.getDirectory(p);
        delete this.flattened[dir.path];
        delete this.fds[dir.fd];
    }

    // fs.rmdir(path, callback)
    rmdir(p: string, callback) {
        setImmediate(() => {
            try {
                this.rmdirSync(p);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }



    // fs.utimesSync(path, atime, mtime)
    utimesSync(filename: string, atime, mtime) {
        var node = this.getNode(filename);
        node.atime = atime;
        node.mtime = mtime;
    }

    // fs.utimes(path, atime, mtime, callback)
    utimes(filename: string, atime, mtime, callback?) {
        setImmediate(() => {
            try {
                callback(null, this.utimesSync(filename, atime, mtime));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.futimesSync(fd, atime, mtime)
    futimesSync(fd: number, atime, mtime) {
        var node = this.getByFd(fd);
        node.atime = atime;
        node.mtime = mtime;
    }

    // fs.futimes(fd, atime, mtime, callback)
    futimes(fd, atime, mtime, callback) {
        setImmediate(() => {
            try {
                callback(null, this.futimesSync(fd, atime, mtime));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.accessSync(path[, mode])
    accessSync(filename: string, mode?) {
        // fs.F_OK | fs.R_OK | fs.W_OK | fs.X_OK
        // Everything passes, as long as a node exists.
        this.getNode(filename);
    }

    // fs.access(path[, mode], callback)
    access(filename: string, mode, callback?) {
        if(typeof mode == 'function') {
            callback = mode;
            mode = 7; // fs.F_OK | fs.R_OK | fs.W_OK | fs.X_OK
        }
        setImmediate(() => {
            try {
                this.accessSync(filename, mode);
                callback();
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.closeSync(fd)
    closeSync(fd) {
        this.getNode(fd);
    }

    // fs.close(fd, callback)
    close(fd, callback) {
        setImmediate(() => {
            try {
                this.closeSync(fd);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.mkdirSync(path[, mode])
    mkdirSync(p: string, mode?) {
        var fullpath = resolve(p);
        var layer = this.getLayerContainingPath(fullpath);
        if(!layer) throw Error('Cannot create directory at this path: ' + fullpath);

        // Check if parent directory exists.
        try {
            var parent = dirname(fullpath);
            var dir = this.getDirectory(parent);
        } catch(e) {
            throw Error(`ENOENT: no such file or directory, mkdir '${fullpath}'`);
        }

        this.addDir(fullpath, layer);
    }

    // fs.mkdir(path[, mode], callback)
    mkdir(p: string, mode, callback?) {
        if(typeof mode == 'function') {
            callback = mode;
            mode = 511; // 0777
        }

        setImmediate(() => {
            try {
                this.mkdirSync(p, mode);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.writeSync(fd, data[, position[, encoding]])
    // fs.writeSync(fd, buffer, offset, length[, position])
    writeSync(fd: number, buffer, offset, length, position?);
    writeSync(fd: number, data, position?, encoding?) {
        var file: File = this.getByFd(fd) as File;
        if(!(file instanceof File)) throw Error('Is not a file: ' + (file as Node).path);

        if(!(data instanceof Buffer)) {
            // Docs: "If data is not a Buffer instance then the value will be coerced to a string."
            data = data.toString();
        } else { // typeof data is Buffer
            var buffer = data;
            var offset = position;
            var length = encoding;
            position = arguments[4];
            data = buffer.slice(offset, length);
            data = data.toString();
        }

        if(typeof position == 'undefined') position = file.position;

        var cont = file.getData();
        cont = cont.substr(0, position) + data + cont.substr(position + data.length);
        file.setData(cont);
        file.position = position + data.length;

        //return data.length;
        return Buffer.byteLength(data, encoding);
    }

    //fs.write(fd, data[, position[, encoding]], callback)
    //fs.write(fd, buffer, offset, length[, position], callback)
    write(fd: number, buffer, offset, length, position, callback?) {
        if(typeof position == 'function') {
            callback = position;
            position = void 0;
        }
        if(typeof length == 'function') {
            callback = length;
            length = position = void 0;
        }
        if(typeof offset == 'function') {
            callback = offset;
            offset = length = position = void 0;
        }

        setImmediate(() => {
            try {
                const bytes = this.writeSync(fd, buffer, offset, length, position);
                if(callback) callback(null, bytes);
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.readSync(fd, buffer, offset, length, position)
    readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number) {
        // TODO: Node.js will read the file forever in `.creatReadStream` mode.
        // TODO: We need to generate new file descriptor `fd` for every new `openSync`
        // TODO: and track position in file for every `readSync` and then when we are at the EOF
        // TODO: we should return 0 (zero bytes read) so the stream closes.
        const file = this.getByFd(fd) as File;
        if(!(file instanceof File)) throw Error('Not a file: ' + (file as Node).path);
        var data = file.getData();
        if(position === null) position = file.position;
        var chunk = data.substr(position, length);
        buffer.write(chunk, offset, length);
        return chunk.length;
    }

    // fs.read(fd, buffer, offset, length, position, callback)
    read(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback) {
        setImmediate(() => {
            try {
                var bytes = this.readSync(fd, buffer, offset, length, position);
                callback(null, bytes, buffer);
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.linkSync(srcpath, dstpath)
    linkSync(srcpath, dstpath) {
        var node = this.getNode(srcpath);
        dstpath = resolve(dstpath);
        if(this.flattened[dstpath]) throw Error('Destination path already in use: ' + dstpath);
        this.flattened[dstpath] = node;
    }

    // fs.link(srcpath, dstpath, callback)
    link(srcpath, dstpath, callback) {
        setImmediate(() => {
            try {
                this.linkSync(srcpath, dstpath);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.symlinkSync(srcpath, dstpath[, type])
    symlinkSync(srcpath, dstpath, t?) {
        this.linkSync(srcpath, dstpath);
    }

    // fs.symlink(srcpath, dstpath[, type], callback)
    symlink(srcpath, dstpath, t, callback?) {
        if(typeof t == 'function') {
            callback = t;
            t = void 0;
        }
        this.link(srcpath, dstpath, callback);
    }

    // fs.readlinkSync(path)
    readlinkSync(p: string) {
        var node = this.getNode(p);
        return node.path;
    }

    // fs.readlink(path, callback)
    readlink(p: string, callback) {
        setImmediate(() => {
            try {
                callback(null, this.readlinkSync(p));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.fsyncSync(fd)
    fsyncSync(fd: number) {
        this.getByFd(fd);
    }

    // fs.fsync(fd, callback)
    fsync(fd, callback) {
        setImmediate(() => {
            try {
                this.fsyncSync(fd);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.createReadStream(path[, options])
    createReadStream(p: string, options?) {
        options = options || {};
        var file = options.fd ? this.getByFd(options.fd) : this.getFile(p);
        if(!(file instanceof File)) throw Error('Not a file: ' + file.path);

        var util = require('util');
        var Readable = require('stream').Readable;
        var Buffer = require('buffer').Buffer;

        function MemFileReadStream(opt?) {
            Readable.call(this, opt);
            this.done = false;
        }
        util.inherits(MemFileReadStream, Readable);
        MemFileReadStream.prototype._read = function() {
            if(!this.done) {
                this.push(new Buffer(file.getData()));
                // this.push(null);
                this.done = true;
            } else {
                this.push(null);
            }
        };

        return new MemFileReadStream();
    }

    // fs.createWriteStream(path[, options])
    createWriteStream(p: string, options?) {
        options = options || {};
        const file = <File> (options.fd ? this.getByFd(options.fd) : this.getFile(p));
        if(!(file instanceof File)) throw Error('Not a file: ' + (file as Node).path);

        if(options.start) file.position = options.start;

        var util = require('util');
        var Writable = require('stream').Writable;
        var Buffer = require('buffer').Buffer;

        function MemFileWriteStream(opt?) {
            Writable.call(this, opt);
        }
        util.inherits(MemFileWriteStream, Writable);
        MemFileWriteStream.prototype._write = function(chunk) {
            chunk = chunk.toString();
            var cont = file.getData();
            cont = cont.substr(0, file.position) + chunk + cont.substr(file.position + chunk.length);
            file.setData(cont);
            file.position += chunk.length;
        };

        return new MemFileWriteStream();
    }

    //fs.watchFile(filename[, options], listener)
    //fs.unwatchFile(filename[, listener])
    //fs.watch(filename[, options][, listener])
    */
}
