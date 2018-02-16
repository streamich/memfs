import {resolve as resolveCrossPlatform} from 'path';
import * as pathModule from 'path';
import {Node, Link, File, Stats} from "./node";
import {Buffer} from 'buffer';
import setImmediate from './setImmediate';
import process from './process';
const extend = require('fast-extend');
const errors = require('./internal/errors');
import setTimeoutUnref, {TSetTimeout} from "./setTimeoutUnref";
import {Readable, Writable} from 'stream';
const util = require('util');
import {constants} from "./constants";
import {EventEmitter} from "events";
const {O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_NOCTTY, O_TRUNC, O_APPEND,
    O_DIRECTORY, O_NOATIME, O_NOFOLLOW, O_SYNC, O_DIRECT, O_NONBLOCK,
    F_OK, R_OK, W_OK, X_OK} = constants;


let sep, relative;
if (pathModule.posix) {
    const {posix} = pathModule;

    sep = posix.sep;
    relative = posix.relative;
} else {
    sep = pathModule.sep;
    relative = pathModule.relative;
}


const isWin = process.platform === 'win32';

// ---------------------------------------- Types

// Node-style errors with a `code` property.
export interface IError extends Error {
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
// type TCallbackWrite = (err?: IError, bytesWritten?: number, source?: Buffer) => void;
// type TCallbackWriteStr = (err?: IError, written?: number, str?: string) => void;


// ---------------------------------------- Constants

const ENCODING_UTF8: TEncoding = 'utf8';

// Default modes for opening files.
const enum MODE {
    FILE = 0o666,
    DIR  = 0o777,
    DEFAULT = MODE.FILE,
}

const kMinPoolSpace = 128;
// const kMaxLength = require('buffer').kMaxLength;


// ---------------------------------------- Error messages

// TODO: Use `internal/errors.js` in the future.

const ERRSTR = {
    PATH_STR:       'path must be a string or Buffer',
    // FD:             'file descriptor must be a unsigned 32-bit integer',
    FD:             'fd must be a file descriptor',
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
        throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}

function getOptions <T extends IOptions> (defaults: T, options?: T|string): T {
    let opts: T;
    if(!options) return defaults;
    else {
        var tipeof = typeof options;
        switch(tipeof) {
            case 'string':
                opts = extend({}, defaults, {encoding: options as string});
                break;
            case 'object':
                opts = extend({}, defaults, options);
                break;
            default: throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }

    if(opts.encoding !== 'buffer')
        assertEncoding(opts.encoding);

    return opts;
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
    encoding?: TEncoding | TEncodingExtended;
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
const getAppendFileOpts = optsGenerator<IAppendFileOptions>(appendFileDefaults);
const getAppendFileOptsAndCb = optsAndCbGenerator<IAppendFileOptions, void>(getAppendFileOpts);


// Options for `fs.realpath` and `fs.realpathSync`
export interface IRealpathOptions {
    encoding?: TEncodingExtended,
}
const realpathDefaults: IReadFileOptions = optsDefaults;
const getRealpathOptions = optsGenerator<IRealpathOptions>(realpathDefaults);
const getRealpathOptsAndCb = optsAndCbGenerator<IRealpathOptions, TDataOut>(getRealpathOptions);


// Options for `fs.watchFile`
export interface IWatchFileOptions {
    persistent?: boolean,
    interval?: number,
}


// Options for `fs.createReadStream`
export interface IReadStreamOptions {
    flags?: TFlags,
    encoding?: TEncoding,
    fd?: number,
    mode?: TMode,
    autoClose?: boolean,
    start?: number,
    end?: number,
}


// Options for `fs.createWriteStream`
export interface IWriteStreamOptions {
    flags?: TFlags,
    defaultEncoding?: TEncoding,
    fd?: number,
    mode?: TMode,
    autoClose?: boolean,
    start?: number,
}


// Options for `fs.watch`
export interface IWatchOptions extends IOptions {
    persistent?: boolean,
    recursive?: boolean,
}



// ---------------------------------------- Utility functions


function getPathFromURLPosix(url) {
    if (url.hostname !== '') {
        return new errors.TypeError('ERR_INVALID_FILE_URL_HOST', process.platform);
    }
    let pathname = url.pathname;
    for (let n = 0; n < pathname.length; n++) {
        if (pathname[n] === '%') {
            let third = pathname.codePointAt(n + 2) | 0x20;
            if (pathname[n + 1] === '2' && third === 102) {
                return new errors.TypeError('ERR_INVALID_FILE_URL_PATH',
                    'must not include encoded / characters');
            }
        }
    }
    return decodeURIComponent(pathname);
}

export function pathToFilename(path: TFilePath): string {
    if((typeof path !== 'string') && !Buffer.isBuffer(path)) {
        try {
            if(!(path instanceof require('url').URL))
                throw new TypeError(ERRSTR.PATH_STR);
        } catch (err) {
            throw new TypeError(ERRSTR.PATH_STR);
        }

        path = getPathFromURLPosix(path);
    }

    const pathString = String(path);
    nullCheck(pathString);
    // return slash(pathString);
    return pathString;
}

type TResolve = (filename: string, base?: string) => string;
let resolve: TResolve = (filename, base = process.cwd()) => resolveCrossPlatform(base, filename);
if(isWin) {
    const _resolve = resolve;
    const {unixify} = require("fs-monkey/lib/correctPath");
    resolve = (filename, base) => unixify(_resolve(filename, base));
}

export function filenameToSteps(filename: string, base?: string): string[] {
    const fullPath = resolve(filename, base);
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

function nullCheck(path, callback?) {
    if(('' + path).indexOf('\u0000') !== -1) {
        const er = new Error('Path must be a string without null bytes');
        (er as any).code = ENOENT;
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

function validateFd(fd) {
    if(!isFd(fd)) throw TypeError(ERRSTR.FD);
}

// converts Date or number to a fractional UNIX timestamp
export function toUnixTimestamp(time) {
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

    static fromJSON(json: {[filename: string]: string}, cwd?: string): Volume {
        const vol = new Volume;
        vol.fromJSON(json, cwd);
        return vol;
    }

    /**
     * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
     * up, so here, in order not to conflict with them, we choose some big number and descrease
     * the file descriptor of every new opened file.
     * @type {number}
     * @todo This should not be static, right?
     */
    static fd: number = 0xFFFFFFFF;

    // Constructor function used to create new nodes.
    // NodeClass: new (...args) => TNode = Node as new (...args) => TNode;

    // Hard link to the root of this volume.
    // root: Node = new (this.NodeClass)(null, '', true);
    root: Link;


    // I-node number counter.
    ino: number = 0;

    // A mapping for i-node numbers to i-nodes (`Node`);
    inodes: {[ino: number]: Node} = {};

    // List of released i-node numbers, for reuse.
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

    StatWatcher: new () => StatWatcher;
    ReadStream: new (...args) => IReadStream;
    WriteStream: new (...args) => IWriteStream;
    FSWatcher: new () => FSWatcher;

    props: {
        Node: new (...args) => Node,
        Link: new (...args) => Link,
        File: new (...File) => File,
    };

    constructor(props = {}) {
        this.props = extend({Node, Link, File}, props);

        const root = this.createLink();
        root.setNode(this.createNode(true));

        const self = this;

        this.StatWatcher = class extends StatWatcher {
            constructor() {
                super(self);
            }
        };

        const _ReadStream: new (...args) => IReadStream = FsReadStream as any;
        this.ReadStream = class extends _ReadStream {
            constructor(...args) {
                super(self, ...args);
            }
        } as any as new (...args) => IReadStream;

        const _WriteStream: new (...args) => IWriteStream = WriteStream as any;
        this.WriteStream = class extends _WriteStream {
            constructor(...args) {
                super(self, ...args);
            }
        } as any as new (...args) => IWriteStream;

        this.FSWatcher = class extends FSWatcher {
            constructor() {
                super(self);
            }
        };

        // root.setChild('.', root);
        // root.getNode().nlink++;

        // root.setChild('..', root);
        // root.getNode().nlink++;

        this.root = root;
    }

    createLink(): Link;
    createLink(parent: Link, name: string, isDirectory?: boolean, perm?: number): Link;
    createLink(parent?: Link, name?: string, isDirectory: boolean = false, perm?: number): Link {
        return parent
            ? parent.createChild(name, this.createNode(isDirectory, perm))
            : new this.props.Link(this, null, '');
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
            this.ino = (this.ino + 1) % 0xFFFFFFFF;
            return this.ino;
        }
    }

    private newFdNumber(): number {
        return this.releasedFds.length ? this.releasedFds.pop() : Volume.fd--;
    }

    createNode(isDirectory: boolean = false, perm?: number): Node {
        const node = new this.props.Node(this.newInoNumber(), perm);
        if(isDirectory) node.setIsDirectory();
        this.inodes[node.ino] = node;
        return node;
    }

    private getNode(ino: number) {
        return this.inodes[ino];
    }

    private deleteNode(node: Node) {
        node.del();
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
    getLinkOrThrow(filename: string, funcName?: string): Link {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if(!link) throwError(ENOENT, funcName, filename);
        return link;
    }

    // Just like `getLink`, but also dereference/resolves symbolic links.
    getResolvedLink(filenameOrSteps: string | string[]): Link {
        let steps: string[] = typeof filenameOrSteps === 'string'
            ? filenameToSteps(filenameOrSteps)
            : filenameOrSteps;

        let link = this.root;
        let i = 0;
        while(i < steps.length) {
            let step = steps[i];
            link = link.getChild(step);
            if(!link) return null;

            const node = link.getNode();
            if(node.isSymlink()) {
                steps = node.symlink.concat(steps.slice(i + 1));
                link = this.root;
                i = 0;
                continue;
            }

            i++;
        }

        return link;
    }

    // Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
    getResolvedLinkOrThrow(filename: string, funcName?: string): Link {
        let link = this.getResolvedLink(filename);
        if(!link) throwError(ENOENT, funcName, filename);
        return link;
    }

    resolveSymlinks(link: Link): Link {
        // let node: Node = link.getNode();
        // while(link && node.isSymlink()) {
        //     link = this.getLink(node.symlink);
        //     if(!link) return null;
        //     node = link.getNode();
        // }
        // return link;
        return this.getResolvedLink(link.steps.slice(1));
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

    private getFileByFd(fd: number): File {
        return this.fds[String(fd)];
    }

    private getFileByFdOrThrow(fd: number, funcName?: string): File {
        if(!isFd(fd)) throw TypeError(ERRSTR.FD);
        const file = this.getFileByFd(fd);
        if(!file) throwError(EBADF, funcName);
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

            throwError(ENOENT, 'getNodeByIdOrCreate', pathToFilename(id))
        }
    }

    private wrapAsync(method: (...args) => void, args: any[], callback: TCallback<any>) {
        validateCallback(callback);
        setImmediate(() => {
            try {
                callback(null, method.apply(this, args));
            } catch(err) {
                callback(err);
            }
        });
    }

    private _toJSON(link = this.root, json = {}, path?: string) {
        for(let name in link.children) {
            let child = link.getChild(name);
            let node = child.getNode();
            if(node.isFile()) {
                let filename = child.getPath();
                if(path) filename = relative(path, filename);
                json[filename] = node.getString();
            } else if(node.isDirectory()) {
                this._toJSON(child, json, path);
            }
        }
        return json;
    }

    toJSON(paths?: TFilePath | TFilePath[], json = {}, isRelative = false) {
        let links: Link[] = [];

        if(paths) {
            if(!(paths instanceof Array)) paths = [paths];
            for(let path of paths) {
                const filename = pathToFilename(path);
                const link = this.getResolvedLink(filename);
                if(!link) continue;
                links.push(link);
            }
        } else {
            links.push(this.root);
        }

        if(!links.length) return json;
        for(let link of links) this._toJSON(link, json, isRelative ? link.getPath() : '');
        return json;
    }

    // fromJSON(json: {[filename: string]: string}, cwd: string = '/') {
    fromJSON(json: {[filename: string]: string}, cwd: string = process.cwd()) {
        for(let filename in json) {
            const data = json[filename];
            filename = resolve(filename, cwd);
            const steps = filenameToSteps(filename);
            if(steps.length > 1) {
                const dirname = sep + steps.slice(0, steps.length - 1).join(sep);
                this.mkdirpBase(dirname, MODE.DIR);
            }
            this.writeFileSync(filename, data);
        }
    }

    reset() {
        this.ino = 0;
        this.inodes = {};
        this.releasedInos = [];
        this.fds = {};
        this.releasedFds = [];
        this.openFiles = 0;

        this.root = this.createLink();
        this.root.setNode(this.createNode(true));
    }

    // Legacy interface
    mountSync(mountpoint: string, json: {[filename: string]: string}) {
        this.fromJSON(json, mountpoint);
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
        if(node.isDirectory() && (flagsNum !== FLAGS.r))
            throwError(EISDIR, 'open', link.getPath());

        // Check node permissions
        if(!(flagsNum & O_WRONLY)) {
            if(!node.canRead()) {
                throwError(EACCES, 'open', link.getPath());
            }
        }
        if(flagsNum & O_RDWR) {

        }

        const file = new this.props.File(link, node, flagsNum, this.newFdNumber());
        this.fds[file.fd] = file;
        this.openFiles++;

        if(flagsNum & O_TRUNC) file.truncate();

        return file;
    }

    private openFile(filename: string, flagsNum: number, modeNum: number, resolveSymlinks: boolean = true): File {
        const steps = filenameToSteps(filename);
        let link: Link = this.getResolvedLink(steps);

        // Try creating a new file, if it does not exist.
        if(!link) {
            // const dirLink: Link = this.getLinkParent(steps);
            const dirLink: Link = this.getResolvedLink(steps.slice(0, steps.length - 1));
            // if(!dirLink) throwError(ENOENT, 'open', filename);
            if(!dirLink) throwError(ENOENT, 'open', sep + steps.join(sep));

            if((flagsNum & O_CREAT) && (typeof modeNum === 'number')) {
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
        }

        if(link) return this.openLink(link, flagsNum, resolveSymlinks);
    }

    private openBase(filename: string, flagsNum: number, modeNum: number, resolveSymlinks: boolean = true): number {
        const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
        if(!file) throwError(ENOENT, 'open', filename);
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
        mode = mode || MODE.DEFAULT;

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
        validateFd(fd);
        const file = this.getFileByFdOrThrow(fd, 'close');
        this.closeFile(file);
    }

    close(fd: number, callback: TCallback<void>) {
        validateFd(fd);
        this.wrapAsync(this.closeSync, [fd], callback);
    }

    private openFileOrGetById(id: TFileId, flagsNum: number, modeNum?: number): File {
        if(typeof id === 'number') {
            const file = this.fds[id];
            if(!file)
                throw createError(ENOENT);
            return file;
        } else {
            return this.openFile(pathToFilename(id), flagsNum, modeNum);
        }
    }

    private readBase(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, position: number): number {
        const file = this.getFileByFdOrThrow(fd);
        return file.read(buffer, Number(offset), Number(length), position);
    }

    readSync(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, position: number): number {
        validateFd(fd);
        return this.readBase(fd, buffer, offset, length, position);
    }

    read(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, position: number,
            callback: (err?: Error, bytesRead?: number, buffer?: Buffer | Uint8Array) => void) {
        validateCallback(callback);

        // This `if` branch is from Node.js
        if(length === 0) {
            return process.nextTick(() => {
                callback && callback(null, 0, buffer);
            });
        }

        setImmediate(() => {
            try {
                const bytes = this.readBase(fd, buffer, offset, length, position);
                callback(null, bytes, buffer);
            } catch(err) {
                callback(err);
            }
        });
    }

    private readFileBase(id: TFileId, flagsNum: number, encoding: TEncoding): Buffer | string {
        let result: Buffer | string;

        const userOwnsFd = isFd(id);
        let fd: number;

        if(userOwnsFd) {
            fd = id as number;
        } else {
            fd = this.openSync(id as TFilePath, flagsNum);
        }

        try {
            result = bufferToEncoding(this.getFileByFdOrThrow(fd).getBuffer(), encoding);
        } finally {
            if(!userOwnsFd) {
                this.closeSync(fd);
            }
        }

        return result;
    }

    readFileSync(file: TFileId, options?: IReadFileOptions|string): TDataOut {
        const opts = getReadFileOptions(options);
        const flagsNum = flagsToNumber(opts.flag);
        return this.readFileBase(file, flagsNum, opts.encoding as TEncoding);
    }

    readFile(id: TFileId, callback: TCallback<TDataOut>);
    readFile(id: TFileId, options: IReadFileOptions|string,                 callback: TCallback<TDataOut>);
    readFile(id: TFileId, a: TCallback<TDataOut>|IReadFileOptions|string,   b?: TCallback<TDataOut>) {
        const [opts, callback] = optsAndCbGenerator<IReadFileOptions, TCallback<TDataOut>>(getReadFileOptions)(a, b);
        const flagsNum = flagsToNumber(opts.flag);
        this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
    }

    private writeBase(fd: number, buf: Buffer, offset?: number, length?: number, position?: number): number {
        const file = this.getFileByFdOrThrow(fd, 'write');
        return file.write(buf, offset, length, position);
    }

    writeSync(fd: number, buffer: Buffer | Uint8Array,      offset?: number,    length?: number,        position?: number): number;
    writeSync(fd: number, str: string,                      position?: number,  encoding?: TEncoding): number;
    writeSync(fd: number, a: string | Buffer | Uint8Array,  b?: number,         c?: number | TEncoding, d?: number): number {
        validateFd(fd);

        let encoding: TEncoding;
        let offset: number;
        let length: number;
        let position: number;

        const isBuffer = typeof a !== 'string';
        if(isBuffer) {
            offset = b | 0;
            length = (c as number);
            position = d;
        } else {
            position = b;
            encoding = c as TEncoding;
        }

        const buf: Buffer = dataToBuffer(a, encoding);

        if(isBuffer) {
            if(typeof length === 'undefined') {
                length = buf.length;
            }
        } else {
            offset = 0;
            length = buf.length;
        }

        return this.writeBase(fd, buf, offset, length, position);
    }

    write(fd: number, buffer: Buffer | Uint8Array, callback: (...args) => void);
    write(fd: number, buffer: Buffer | Uint8Array, offset: number, callback: (...args) => void);
    write(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, callback: (...args) => void);
    write(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, position: number, callback: (...args) => void);
    write(fd: number, str: string, callback: (...args) => void);
    write(fd: number, str: string, position: number, callback: (...args) => void);
    write(fd: number, str: string, position: number, encoding: TEncoding, callback: (...args) => void);
    write(fd: number, a?, b?, c?, d?, e?) {
        validateFd(fd);

        let offset: number;
        let length: number;
        let position: number;
        let encoding: TEncoding;
        let callback: (...args) => void;

        const tipa = typeof a;
        const tipb = typeof b;
        const tipc = typeof c;
        const tipd = typeof d;

        if(tipa !== 'string') {
            if(tipb === 'function') {
                callback = b;
            } else if(tipc === 'function') {
                offset = b | 0;
                callback = c;
            } else if(tipd === 'function') {
                offset = b | 0;
                length = c;
                callback = d;
            } else {
                offset = b | 0;
                length = c;
                position = d;
                callback = e;
            }
        } else {
            if(tipb === 'function') {
                callback = b;
            } else if(tipc === 'function') {
                position = b;
                callback = c;
            } else if(tipd === 'function') {
                position = b;
                encoding = c;
                callback = d;
            }
        }

        const buf: Buffer = dataToBuffer(a, encoding);

        if(tipa !== 'string') {
            if(typeof length === 'undefined') length = buf.length;
        } else {
            offset = 0;
            length = buf.length;
        }

        validateCallback(callback);

        setImmediate(() => {
            try {
                const bytes = this.writeBase(fd, buf, offset, length, position);
                if(tipa !== 'string') {
                    callback(null, bytes, buf);
                } else {
                    callback(null, bytes, a);
                }
            } catch(err) {
                callback(err);
            }
        });
    }

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
        if(!link1) throwError(ENOENT, 'link', filename1, filename2);

        const steps2 = filenameToSteps(filename2);

        // Check new link directory exists.
        const dir2 = this.getLinkParent(steps2);
        if(!dir2) throwError(ENOENT, 'link', filename1, filename2);

        const name = steps2[steps2.length - 1];

        // Check if new file already exists.
        if(dir2.getChild(name))
            throwError(EEXIST, 'link', filename1, filename2);

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
        if(!link) throwError(ENOENT, 'unlink', filename);

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
        if(!dirLink) throwError(ENOENT, 'symlink', targetFilename, pathFilename);

        const name = pathSteps[pathSteps.length - 1];

        // Check if new file already exists.
        if(dirLink.getChild(name))
            throwError(EEXIST, 'symlink', targetFilename, pathFilename);

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
    symlink(target: TFilePath, path: TFilePath, type: 'file' | 'dir' | 'junction',      callback: TCallback<void>);
    symlink(target: TFilePath, path: TFilePath, a,                                      b?) {
        const [type, callback] = getArgAndCb<'file' | 'dir' | 'junction', TCallback<void>>(a, b);
        const targetFilename = pathToFilename(target);
        const pathFilename = pathToFilename(path);
        this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
    }

    private realpathBase(filename: string, encoding: TEncodingExtended): TDataOut {
        const steps = filenameToSteps(filename);
        const link: Link = this.getLink(steps);
        // TODO: this check has to be perfomed by `lstat`.
        if(!link) throwError(ENOENT, 'realpath', filename);

        // Resolve symlinks.
        const realLink = this.resolveSymlinks(link);
        if(!realLink) throwError(ENOENT, 'realpath', filename);

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
        if(!link) throwError(ENOENT, 'lstat', filename);
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
        if(!link) throwError(ENOENT, 'stat', filename);

        // Resolve symlinks.
        link = this.resolveSymlinks(link);
        if(!link) throwError(ENOENT, 'stat', filename);

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
        if(!file) throwError(EBADF, 'fstat');
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
        if(!link) throwError(ENOENT, 'rename', oldPathFilename, newPathFilename);

        // TODO: Check if it is directory, if non-empty, we cannot move it, right?

        const newPathSteps = filenameToSteps(newPathFilename);

        // Check directory exists for the new location.
        const newPathDirLink: Link = this.getLinkParent(newPathSteps);
        if(!newPathDirLink) throwError(ENOENT, 'rename', oldPathFilename, newPathFilename);

        // TODO: Also treat cases with directories and symbolic links.
        // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html

        // Remove hard link from old folder.
        const oldLinkParent = link.parent;
        if(oldLinkParent) {
            oldLinkParent.deleteChild(link);
        }

        // Rename should overwrite the new path, if that exists.
        const name = newPathSteps[newPathSteps.length - 1];
        link.steps = [...newPathDirLink.steps, name];
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
        try {
            return this.existsBase(pathToFilename(path));
        } catch(err) {
            return false;
        }
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
        const link = this.getLinkOrThrow(filename, 'access');

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
        const opts = getAppendFileOpts(options);

        // force append behavior when using a supplied file descriptor
        if (!opts.flag || isFd(id)) opts.flag = 'a';

        this.writeFileSync(id, data, opts);
    }

    appendFile(id: TFileId, data: TData, callback: TCallback<void>);
    appendFile(id: TFileId, data: TData, options: IAppendFileOptions, callback: TCallback<void>);
    appendFile(id: TFileId, data: TData, a, b?) {
        const [opts, callback] = getAppendFileOptsAndCb(a, b);

        // force append behavior when using a supplied file descriptor
        if (!opts.flag || isFd(id)) opts.flag = 'a';

        this.writeFile(id, data, opts, callback);
    }

    private readdirBase(filename: string, encoding: TEncodingExtended): TDataOut[] {
        const steps = filenameToSteps(filename);
        const link: Link = this.getLink(steps);
        if(!link) throwError(ENOENT, 'readdir', filename);

        const node = link.getNode();
        if(!node.isDirectory())
            throwError(ENOTDIR, 'scandir', filename);

        const list: TDataOut[] = [];
        for(let name in link.children)
            list.push(strToEncoding(name, encoding));

        if(!isWin && encoding !== 'buffer') list.sort();

        return list;
    }

    readdirSync(path: TFilePath, options?: IOptions | string): TDataOut[] {
        const opts = getDefaultOpts(options);
        const filename = pathToFilename(path);
        return this.readdirBase(filename, opts.encoding);
    }

    readdir(path: TFilePath, callback: TCallback<TDataOut[]>);
    readdir(path: TFilePath, options: IOptions | string,                        callback: TCallback<TDataOut[]>);
    readdir(path: TFilePath, a?, b?) {
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

        if(!node.isSymlink()) throwError(EINVAL, 'readlink', filename);

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

    private statWatchers = {};

    watchFile(path: TFilePath, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    watchFile(path: TFilePath, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
    watchFile(path: TFilePath, a, b?): StatWatcher {
        const filename = pathToFilename(path);

        let options: IWatchFileOptions = a;
        let listener: (curr: Stats, prev: Stats) => void = b;

        if(typeof options === 'function') {
            listener = a;
            options = null;
        }

        if(typeof listener !== 'function') {
            throw Error('"watchFile()" requires a listener function');
        }

        let interval = 5007;
        let persistent = true;

        if(options && (typeof options === 'object')) {
            if(typeof options.interval === 'number') interval = options.interval;
            if(typeof options.persistent === 'boolean') persistent = options.persistent;
        }

        let watcher: StatWatcher = this.statWatchers[filename];

        if(!watcher) {
            watcher = new this.StatWatcher;
            watcher.start(filename, persistent, interval);
            this.statWatchers[filename] = watcher;
        }

        watcher.addListener('change', listener);
        return watcher;
    }

    unwatchFile(path: TFilePath, listener?: (curr: Stats, prev: Stats) => void) {
        const filename = pathToFilename(path);
        const watcher = this.statWatchers[filename];
        if(!watcher) return;

        if(typeof listener === 'function') {
            watcher.removeListener('change', listener);
        } else {
            watcher.removeAllListeners('change');
        }

        if(watcher.listenerCount('change') === 0) {
            watcher.stop();
            delete this.statWatchers[filename];
        }
    }

    createReadStream(path: TFilePath, options?: IReadStreamOptions | string): IReadStream {
        return new this.ReadStream(path, options);
    }

    createWriteStream(path: TFilePath, options?: IWriteStreamOptions | string): IWriteStream {
        return new this.WriteStream(path, options);
    }

    // watch(path: TFilePath): FSWatcher;
    // watch(path: TFilePath, options?: IWatchOptions | string): FSWatcher;
    watch(path: TFilePath, options?: IWatchOptions | string, listener?: (eventType: string, filename: string) => void): FSWatcher {
        const filename = pathToFilename(path);

        if(typeof options === 'function') {
            listener = options;
            options = null;
        }

        let {persistent, recursive, encoding}: IWatchOptions = getDefaultOpts(options);
        if(persistent === undefined) persistent = true;
        if(recursive === undefined) recursive = false;

        const watcher = new this.FSWatcher;
        watcher.start(filename, persistent, recursive, encoding as TEncoding);

        if(listener) {
            watcher.addListener('change', listener);
        }

        return watcher;
    }
}


function emitStop(self) {
    self.emit('stop');
}


export class StatWatcher extends EventEmitter {

    vol: Volume = null;
    filename: string;
    interval: number;
    timeoutRef = null;
    setTimeout: TSetTimeout;
    prev: Stats = null;

    constructor(vol: Volume) {
        super();
        this.vol = vol;
    }

    private loop() {
        this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
    }

    private hasChanged(stats: Stats): boolean {
        // if(!this.prev) return false;
        if(stats.mtimeMs > this.prev.mtimeMs) return true;
        if(stats.nlink !== this.prev.nlink) return true;
        return false;
    }

    private onInterval = () => {
        try {
            const stats = this.vol.statSync(this.filename);
            if(this.hasChanged(stats)) {
                this.emit('change', stats, this.prev);
                this.prev = stats;
            }
        } finally {
            this.loop();
        }
    };

    start(path: string, persistent: boolean = true, interval: number = 5007) {
        this.filename = pathToFilename(path);
        this.setTimeout = persistent ? setTimeout : setTimeoutUnref;
        this.interval = interval;
        this.prev = this.vol.statSync(this.filename);
        this.loop();
    }

    stop() {
        clearTimeout(this.timeoutRef);
        process.nextTick(emitStop, this);
    }
}






// ---------------------------------------- ReadStream

export interface IReadStream extends Readable {
    new (path: TFilePath, options: IReadStreamOptions),
    open(),
    close(callback: TCallback<void>),
    bytesRead: number,
    path: string,
}

var pool;

function allocNewPool(poolSize) {
    pool = Buffer.allocUnsafe(poolSize);
    pool.used = 0;
}

util.inherits(FsReadStream, Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
    if (!(this instanceof FsReadStream))
        return new (FsReadStream as any)(vol, path, options);

    this._vol = vol;

    // a little bit bigger buffer and water marks by default
    options = extend({}, getOptions(options, {}));
    if (options.highWaterMark === undefined)
        options.highWaterMark = 64 * 1024;

    Readable.call(this, options);

    this.path = pathToFilename(path);
    this.fd = options.fd === undefined ? null : options.fd;
    this.flags = options.flags === undefined ? 'r' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;

    this.start = options.start;
    this.end = options.end;
    this.autoClose = options.autoClose === undefined ? true : options.autoClose;
    this.pos = undefined;
    this.bytesRead = 0;

    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.end === undefined) {
            this.end = Infinity;
        } else if (typeof this.end !== 'number') {
            throw new TypeError('"end" option must be a Number');
        }

        if (this.start > this.end) {
            throw new Error('"start" option must be <= "end" option');
        }

        this.pos = this.start;
    }

    if (typeof this.fd !== 'number')
        this.open();

    this.on('end', function() {
        if (this.autoClose) {
            if(this.destroy) this.destroy();
        }
    });
}

FsReadStream.prototype.open = function() {
    var self = this;
    this._vol.open(this.path, this.flags, this.mode, function(er, fd) {
        if (er) {
            if (self.autoClose) {
                self.destroy();
            }
            self.emit('error', er);
            return;
        }

        self.fd = fd;
        self.emit('open', fd);
        // start the flow of data.
        self.read();
    });
};

FsReadStream.prototype._read = function(n) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function() {
            this._read(n);
        });
    }

    if (this.destroyed)
        return;

    if (!pool || pool.length - pool.used < kMinPoolSpace) {
        // discard the old pool.
        allocNewPool(this._readableState.highWaterMark);
    }

    // Grab another reference to the pool in the case that while we're
    // in the thread pool another read() finishes up the pool, and
    // allocates a new one.
    var thisPool = pool;
    var toRead = Math.min(pool.length - pool.used, n);
    var start = pool.used;

    if (this.pos !== undefined)
        toRead = Math.min(this.end - this.pos + 1, toRead);

    // already read everything we were supposed to read!
    // treat as EOF.
    if (toRead <= 0)
        return this.push(null);

    // the actual read.
    var self = this;
    this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);

    // move the pool positions, and internal position for reading.
    if (this.pos !== undefined)
        this.pos += toRead;
    pool.used += toRead;

    function onread(er, bytesRead) {
        if (er) {
            if (self.autoClose) {
                self.destroy();
            }
            self.emit('error', er);
        } else {
            var b = null;
            if (bytesRead > 0) {
                self.bytesRead += bytesRead;
                b = thisPool.slice(start, start + bytesRead);
            }

            self.push(b);
        }
    }
};

FsReadStream.prototype._destroy = function(err, cb) {
    this.close(function(err2) {
        cb(err || err2);
    });
};

FsReadStream.prototype.close = function(cb) {
    if (cb)
        this.once('close', cb);

    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return process.nextTick(() => this.emit('close'));
    }

    this.closed = true;

    this._vol.close(this.fd, (er) => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });

    this.fd = null;
};

// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen(fd) {
    this.close();
}






// ---------------------------------------- WriteStream

export interface IWriteStream extends Writable {
    bytesWritten: number;
    path: string;
    new (path: TFilePath, options: IWriteStreamOptions),
    open(),
    close(),
}

util.inherits(WriteStream, Writable);
exports.WriteStream = WriteStream;
function WriteStream(vol, path, options) {
    if (!(this instanceof WriteStream))
        return new (WriteStream as any)(vol, path, options);

    this._vol = vol;
    options = extend({}, getOptions(options, {}));

    Writable.call(this, options);

    this.path = pathToFilename(path);
    this.fd = options.fd === undefined ? null : options.fd;
    this.flags = options.flags === undefined ? 'w' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;

    this.start = options.start;
    this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
    this.pos = undefined;
    this.bytesWritten = 0;

    if (this.start !== undefined) {
        if (typeof this.start !== 'number') {
            throw new TypeError('"start" option must be a Number');
        }
        if (this.start < 0) {
            throw new Error('"start" must be >= zero');
        }

        this.pos = this.start;
    }

    if (options.encoding)
        this.setDefaultEncoding(options.encoding);

    if (typeof this.fd !== 'number')
        this.open();

    // dispose on finish.
    this.once('finish', function() {
        if (this.autoClose) {
            this.close();
        }
    });
}

WriteStream.prototype.open = function() {
    this._vol.open(this.path, this.flags, this.mode, function(er, fd) {
        if (er) {
            if (this.autoClose) {
                this.destroy();
            }
            this.emit('error', er);
            return;
        }

        this.fd = fd;
        this.emit('open', fd);
    }.bind(this));
};

WriteStream.prototype._write = function(data, encoding, cb) {
    if (!(data instanceof Buffer))
        return this.emit('error', new Error('Invalid data'));

    if (typeof this.fd !== 'number') {
        return this.once('open', function() {
            this._write(data, encoding, cb);
        });
    }

    var self = this;
    this._vol.write(this.fd, data, 0, data.length, this.pos, function(er, bytes) {
        if (er) {
            if (self.autoClose) {
                self.destroy();
            }
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });

    if (this.pos !== undefined)
        this.pos += data.length;
};

WriteStream.prototype._writev = function(data, cb) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function() {
            this._writev(data, cb);
        });
    }

    const self = this;
    const len = data.length;
    const chunks = new Array(len);
    var size = 0;

    for (var i = 0; i < len; i++) {
        var chunk = data[i].chunk;

        chunks[i] = chunk;
        size += chunk.length;
    }

    const buf = Buffer.concat(chunks);
    this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
        if (er) {
            self.destroy();
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });

    if (this.pos !== undefined)
        this.pos += size;
};


WriteStream.prototype._destroy = FsReadStream.prototype._destroy;
WriteStream.prototype.close = FsReadStream.prototype.close;

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end;







// ---------------------------------------- FSWatcher

export class FSWatcher extends EventEmitter {
    _vol: Volume;
    _filename: string = '';
    _steps: string[] = null;
    _filenameEncoded: TDataOut = '';
    // _persistent: boolean = true;
    _recursive: boolean = false;
    _encoding: TEncoding = ENCODING_UTF8;
    _link: Link = null;

    _timer; // Timer that keeps this task persistent.

    constructor(vol: Volume) {
        super();
        this._vol = vol;


        // TODO: Emit "error" messages when watching.
        // this._handle.onchange = function(status, eventType, filename) {
        //     if (status < 0) {
        //         self._handle.close();
        //         const error = !filename ?
        //             errnoException(status, 'Error watching file for changes:') :
        //             errnoException(status, `Error watching file ${filename} for changes:`);
        //         error.filename = filename;
        //         self.emit('error', error);
        //     } else {
        //         self.emit('change', eventType, filename);
        //     }
        // };
    }

    private _getName(): string {
        return this._steps[this._steps.length - 1];
    }

    private _onNodeChange = () => {
        this._emit('change');
    };

    private _onParentChild = (link: Link) => {
        if(link.getName() === this._getName()) {
            this._emit('rename');
        }
    };

    private _emit = (type: 'change' | 'rename') => {
        this.emit('change', type, this._filenameEncoded);
    };

    private _persist = () => {
        this._timer = setTimeout(this._persist, 1e6);
    };

    start(path: TFilePath, persistent: boolean = true, recursive: boolean = false, encoding: TEncoding = ENCODING_UTF8) {
        this._filename = pathToFilename(path);
        this._steps = filenameToSteps(this._filename);
        this._filenameEncoded = strToEncoding(this._filename);
        // this._persistent = persistent;
        this._recursive = recursive;
        this._encoding = encoding;

        try {
            this._link = this._vol.getLinkOrThrow(this._filename, 'FSWatcher');
        } catch(err) {
            const error = new Error(`watch ${this._filename} ${err.code}`);
            (error as any).code = err.code;
            (error as any).errno = err.code;
            throw error;
        }

        this._link.getNode().on('change', this._onNodeChange);

        const parent = this._link.parent;
        if(parent) {
            // parent.on('child:add', this._onParentChild);
            parent.on('child:delete', this._onParentChild);
        }

        if(persistent)
            this._persist();
    }

    close() {
        clearTimeout(this._timer);

        this._link.getNode().removeListener('change', this._onNodeChange);

        const parent = this._link.parent;
        if(parent) {
            // parent.removeListener('child:add', this._onParentChild);
            parent.removeListener('child:delete', this._onParentChild);
        }
    }
}
