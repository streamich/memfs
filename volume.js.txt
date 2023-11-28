"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSWatcher = exports.StatWatcher = exports.Volume = exports.toUnixTimestamp = exports.dataToStr = exports.pathToSteps = exports.filenameToSteps = void 0;
const pathModule = require("path");
const node_1 = require("./node");
const Stats_1 = require("./Stats");
const Dirent_1 = require("./Dirent");
const buffer_1 = require("./internal/buffer");
const setImmediate_1 = require("./setImmediate");
const queueMicrotask_1 = require("./queueMicrotask");
const process_1 = require("./process");
const setTimeoutUnref_1 = require("./setTimeoutUnref");
const stream_1 = require("stream");
const constants_1 = require("./constants");
const events_1 = require("events");
const encoding_1 = require("./encoding");
const FileHandle_1 = require("./node/FileHandle");
const util = require("util");
const FsPromises_1 = require("./node/FsPromises");
const print_1 = require("./print");
const constants_2 = require("./node/constants");
const options_1 = require("./node/options");
const util_1 = require("./node/util");
const resolveCrossPlatform = pathModule.resolve;
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY, O_SYMLINK, F_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE, } = constants_1.constants;
const { sep, relative, join, dirname } = pathModule.posix ? pathModule.posix : pathModule;
// ---------------------------------------- Constants
const kMinPoolSpace = 128;
// ---------------------------------------- Error messages
const EPERM = 'EPERM';
const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';
const ENOSYS = 'ENOSYS';
const ERR_FS_EISDIR = 'ERR_FS_EISDIR';
const ERR_OUT_OF_RANGE = 'ERR_OUT_OF_RANGE';
let resolve = (filename, base = process_1.default.cwd()) => resolveCrossPlatform(base, filename);
if (util_1.isWin) {
    const _resolve = resolve;
    resolve = (filename, base) => (0, util_1.unixify)(_resolve(filename, base));
}
function filenameToSteps(filename, base) {
    const fullPath = resolve(filename, base);
    const fullPathSansSlash = fullPath.substring(1);
    if (!fullPathSansSlash)
        return [];
    return fullPathSansSlash.split(sep);
}
exports.filenameToSteps = filenameToSteps;
function pathToSteps(path) {
    return filenameToSteps((0, util_1.pathToFilename)(path));
}
exports.pathToSteps = pathToSteps;
function dataToStr(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data.toString(encoding);
    else if (data instanceof Uint8Array)
        return (0, buffer_1.bufferFrom)(data).toString(encoding);
    else
        return String(data);
}
exports.dataToStr = dataToStr;
// converts Date or number to a fractional UNIX timestamp
function toUnixTimestamp(time) {
    // tslint:disable-next-line triple-equals
    if (typeof time === 'string' && +time == time) {
        return +time;
    }
    if (time instanceof Date) {
        return time.getTime() / 1000;
    }
    if (isFinite(time)) {
        if (time < 0) {
            return Date.now() / 1000;
        }
        return time;
    }
    throw new Error('Cannot parse time: ' + time);
}
exports.toUnixTimestamp = toUnixTimestamp;
function validateUid(uid) {
    if (typeof uid !== 'number')
        throw TypeError(constants_2.ERRSTR.UID);
}
function validateGid(gid) {
    if (typeof gid !== 'number')
        throw TypeError(constants_2.ERRSTR.GID);
}
function flattenJSON(nestedJSON) {
    const flatJSON = {};
    function flatten(pathPrefix, node) {
        for (const path in node) {
            const contentOrNode = node[path];
            const joinedPath = join(pathPrefix, path);
            if (typeof contentOrNode === 'string' || contentOrNode instanceof buffer_1.Buffer) {
                flatJSON[joinedPath] = contentOrNode;
            }
            else if (typeof contentOrNode === 'object' && contentOrNode !== null && Object.keys(contentOrNode).length > 0) {
                // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered
                flatten(joinedPath, contentOrNode);
            }
            else {
                // without this branch null, empty-object or non-object entries would not be handled in the same way
                // by both fromJSON() and fromNestedJSON()
                flatJSON[joinedPath] = null;
            }
        }
    }
    flatten('', nestedJSON);
    return flatJSON;
}
const notImplemented = () => {
    throw new Error('Not implemented');
};
/**
 * `Volume` represents a file system.
 */
class Volume {
    static fromJSON(json, cwd) {
        const vol = new Volume();
        vol.fromJSON(json, cwd);
        return vol;
    }
    static fromNestedJSON(json, cwd) {
        const vol = new Volume();
        vol.fromNestedJSON(json, cwd);
        return vol;
    }
    get promises() {
        if (this.promisesApi === null)
            throw new Error('Promise is not supported in this environment.');
        return this.promisesApi;
    }
    constructor(props = {}, caseSensitive = true) {
        // I-node number counter.
        this.ino = 0;
        // A mapping for i-node numbers to i-nodes (`Node`);
        this.inodes = {};
        // List of released i-node numbers, for reuse.
        this.releasedInos = [];
        // A mapping for file descriptors to `File`s.
        this.fds = {};
        // A list of reusable (opened and closed) file descriptors, that should be
        // used first before creating a new file descriptor.
        this.releasedFds = [];
        // Max number of open files.
        this.maxFiles = 10000;
        // Current number of open files.
        this.openFiles = 0;
        this.promisesApi = new FsPromises_1.FsPromises(this, FileHandle_1.FileHandle);
        this.statWatchers = {};
        this.cpSync = notImplemented;
        this.lutimesSync = notImplemented;
        this.statfsSync = notImplemented;
        this.opendirSync = notImplemented;
        this.cp = notImplemented;
        this.lutimes = notImplemented;
        this.statfs = notImplemented;
        this.openAsBlob = notImplemented;
        this.opendir = notImplemented;
        this.props = Object.assign({ Node: node_1.Node, Link: node_1.Link, File: node_1.File }, props);
        this.caseSensitive = caseSensitive;
        const root = this.createLink();
        root.setNode(this.createNode(true));
        const self = this; // tslint:disable-line no-this-assignment
        this.StatWatcher = class extends StatWatcher {
            constructor() {
                super(self);
            }
        };
        const _ReadStream = FsReadStream;
        this.ReadStream = class extends _ReadStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        const _WriteStream = FsWriteStream;
        this.WriteStream = class extends _WriteStream {
            constructor(...args) {
                super(self, ...args);
            }
        };
        this.FSWatcher = class extends FSWatcher {
            constructor() {
                super(self);
            }
        };
        root.setChild('.', root);
        root.getNode().nlink++;
        root.setChild('..', root);
        root.getNode().nlink++;
        this.root = root;
    }
    createLink(parent, name, isDirectory = false, perm) {
        if (!parent) {
            return new this.props.Link(this, null, '');
        }
        if (!name) {
            throw new Error('createLink: name cannot be empty');
        }
        return parent.createChild(name, this.createNode(isDirectory, perm));
    }
    deleteLink(link) {
        const parent = link.parent;
        if (parent) {
            parent.deleteChild(link);
            return true;
        }
        return false;
    }
    newInoNumber() {
        const releasedFd = this.releasedInos.pop();
        if (releasedFd)
            return releasedFd;
        else {
            this.ino = (this.ino + 1) % 0xffffffff;
            return this.ino;
        }
    }
    newFdNumber() {
        const releasedFd = this.releasedFds.pop();
        return typeof releasedFd === 'number' ? releasedFd : Volume.fd--;
    }
    createNode(isDirectory = false, perm) {
        const node = new this.props.Node(this.newInoNumber(), perm);
        if (isDirectory)
            node.setIsDirectory();
        this.inodes[node.ino] = node;
        return node;
    }
    deleteNode(node) {
        node.del();
        delete this.inodes[node.ino];
        this.releasedInos.push(node.ino);
    }
    // Returns a `Link` (hard link) referenced by path "split" into steps.
    getLink(steps) {
        return this.root.walk(steps);
    }
    // Just link `getLink`, but throws a correct user error, if link to found.
    getLinkOrThrow(filename, funcName) {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if (!link)
            throw (0, util_1.createError)(ENOENT, funcName, filename);
        return link;
    }
    // Just like `getLink`, but also dereference/resolves symbolic links.
    getResolvedLink(filenameOrSteps) {
        let steps = typeof filenameOrSteps === 'string' ? filenameToSteps(filenameOrSteps) : filenameOrSteps;
        let link = this.root;
        let i = 0;
        while (i < steps.length) {
            const step = steps[i];
            link = link.getChild(step);
            if (!link)
                return null;
            const node = link.getNode();
            if (node.isSymlink()) {
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
    getResolvedLinkOrThrow(filename, funcName) {
        const link = this.getResolvedLink(filename);
        if (!link)
            throw (0, util_1.createError)(ENOENT, funcName, filename);
        return link;
    }
    resolveSymlinks(link) {
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
    getLinkAsDirOrThrow(filename, funcName) {
        const link = this.getLinkOrThrow(filename, funcName);
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)(ENOTDIR, funcName, filename);
        return link;
    }
    // Get the immediate parent directory of the link.
    getLinkParent(steps) {
        return this.root.walk(steps, steps.length - 1);
    }
    getLinkParentAsDirOrThrow(filenameOrSteps, funcName) {
        const steps = filenameOrSteps instanceof Array ? filenameOrSteps : filenameToSteps(filenameOrSteps);
        const link = this.getLinkParent(steps);
        if (!link)
            throw (0, util_1.createError)(ENOENT, funcName, sep + steps.join(sep));
        if (!link.getNode().isDirectory())
            throw (0, util_1.createError)(ENOTDIR, funcName, sep + steps.join(sep));
        return link;
    }
    getFileByFd(fd) {
        return this.fds[String(fd)];
    }
    getFileByFdOrThrow(fd, funcName) {
        if (!(0, util_1.isFd)(fd))
            throw TypeError(constants_2.ERRSTR.FD);
        const file = this.getFileByFd(fd);
        if (!file)
            throw (0, util_1.createError)(EBADF, funcName);
        return file;
    }
    /**
     * @todo This is not used anymore. Remove.
     */
    /*
    private getNodeByIdOrCreate(id: TFileId, flags: number, perm: number): Node {
      if (typeof id === 'number') {
        const file = this.getFileByFd(id);
        if (!file) throw Error('File nto found');
        return file.node;
      } else {
        const steps = pathToSteps(id as PathLike);
        let link = this.getLink(steps);
        if (link) return link.getNode();
  
        // Try creating a node if not found.
        if (flags & O_CREAT) {
          const dirLink = this.getLinkParent(steps);
          if (dirLink) {
            const name = steps[steps.length - 1];
            link = this.createLink(dirLink, name, false, perm);
            return link.getNode();
          }
        }
  
        throw createError(ENOENT, 'getNodeByIdOrCreate', pathToFilename(id));
      }
    }
    */
    wrapAsync(method, args, callback) {
        (0, util_1.validateCallback)(callback);
        (0, setImmediate_1.default)(() => {
            let result;
            try {
                result = method.apply(this, args);
            }
            catch (err) {
                callback(err);
                return;
            }
            callback(null, result);
        });
    }
    _toJSON(link = this.root, json = {}, path, asBuffer) {
        let isEmpty = true;
        let children = link.children;
        if (link.getNode().isFile()) {
            children = new Map([[link.getName(), link.parent.getChild(link.getName())]]);
            link = link.parent;
        }
        for (const name of children.keys()) {
            if (name === '.' || name === '..') {
                continue;
            }
            isEmpty = false;
            const child = link.getChild(name);
            if (!child) {
                throw new Error('_toJSON: unexpected undefined');
            }
            const node = child.getNode();
            if (node.isFile()) {
                let filename = child.getPath();
                if (path)
                    filename = relative(path, filename);
                json[filename] = asBuffer ? node.getBuffer() : node.getString();
            }
            else if (node.isDirectory()) {
                this._toJSON(child, json, path);
            }
        }
        let dirPath = link.getPath();
        if (path)
            dirPath = relative(path, dirPath);
        if (dirPath && isEmpty) {
            json[dirPath] = null;
        }
        return json;
    }
    toJSON(paths, json = {}, isRelative = false, asBuffer = false) {
        const links = [];
        if (paths) {
            if (!Array.isArray(paths))
                paths = [paths];
            for (const path of paths) {
                const filename = (0, util_1.pathToFilename)(path);
                const link = this.getResolvedLink(filename);
                if (!link)
                    continue;
                links.push(link);
            }
        }
        else {
            links.push(this.root);
        }
        if (!links.length)
            return json;
        for (const link of links)
            this._toJSON(link, json, isRelative ? link.getPath() : '', asBuffer);
        return json;
    }
    // TODO: `cwd` should probably not invoke `process.cwd()`.
    fromJSON(json, cwd = process_1.default.cwd()) {
        for (let filename in json) {
            const data = json[filename];
            filename = resolve(filename, cwd);
            if (typeof data === 'string' || data instanceof buffer_1.Buffer) {
                const dir = dirname(filename);
                this.mkdirpBase(dir, 511 /* MODE.DIR */);
                this.writeFileSync(filename, data);
            }
            else {
                this.mkdirpBase(filename, 511 /* MODE.DIR */);
            }
        }
    }
    fromNestedJSON(json, cwd) {
        this.fromJSON(flattenJSON(json), cwd);
    }
    toTree(opts = { separator: sep }) {
        return (0, print_1.toTreeSync)(this, opts);
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
    mountSync(mountpoint, json) {
        this.fromJSON(json, mountpoint);
    }
    openLink(link, flagsNum, resolveSymlinks = true) {
        if (this.openFiles >= this.maxFiles) {
            // Too many open files.
            throw (0, util_1.createError)(EMFILE, 'open', link.getPath());
        }
        // Resolve symlinks.
        let realLink = link;
        if (resolveSymlinks)
            realLink = this.resolveSymlinks(link);
        if (!realLink)
            throw (0, util_1.createError)(ENOENT, 'open', link.getPath());
        const node = realLink.getNode();
        // Check whether node is a directory
        if (node.isDirectory()) {
            if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY)
                throw (0, util_1.createError)(EISDIR, 'open', link.getPath());
        }
        else {
            if (flagsNum & O_DIRECTORY)
                throw (0, util_1.createError)(ENOTDIR, 'open', link.getPath());
        }
        // Check node permissions
        if (!(flagsNum & O_WRONLY)) {
            if (!node.canRead()) {
                throw (0, util_1.createError)(EACCES, 'open', link.getPath());
            }
        }
        if (flagsNum & O_RDWR) {
        }
        const file = new this.props.File(link, node, flagsNum, this.newFdNumber());
        this.fds[file.fd] = file;
        this.openFiles++;
        if (flagsNum & O_TRUNC)
            file.truncate();
        return file;
    }
    openFile(filename, flagsNum, modeNum, resolveSymlinks = true) {
        const steps = filenameToSteps(filename);
        let link = resolveSymlinks ? this.getResolvedLink(steps) : this.getLink(steps);
        if (link && flagsNum & O_EXCL)
            throw (0, util_1.createError)(EEXIST, 'open', filename);
        // Try creating a new file, if it does not exist.
        if (!link && flagsNum & O_CREAT) {
            // const dirLink: Link = this.getLinkParent(steps);
            const dirLink = this.getResolvedLink(steps.slice(0, steps.length - 1));
            // if(!dirLink) throw createError(ENOENT, 'open', filename);
            if (!dirLink)
                throw (0, util_1.createError)(ENOENT, 'open', sep + steps.join(sep));
            if (flagsNum & O_CREAT && typeof modeNum === 'number') {
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
        }
        if (link)
            return this.openLink(link, flagsNum, resolveSymlinks);
        throw (0, util_1.createError)(ENOENT, 'open', filename);
    }
    openBase(filename, flagsNum, modeNum, resolveSymlinks = true) {
        const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
        if (!file)
            throw (0, util_1.createError)(ENOENT, 'open', filename);
        return file.fd;
    }
    openSync(path, flags, mode = 438 /* MODE.DEFAULT */) {
        // Validate (1) mode; (2) path; (3) flags - in that order.
        const modeNum = (0, util_1.modeToNumber)(mode);
        const fileName = (0, util_1.pathToFilename)(path);
        const flagsNum = (0, util_1.flagsToNumber)(flags);
        return this.openBase(fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK));
    }
    open(path, flags, a, b) {
        let mode = a;
        let callback = b;
        if (typeof a === 'function') {
            mode = 438 /* MODE.DEFAULT */;
            callback = a;
        }
        mode = mode || 438 /* MODE.DEFAULT */;
        const modeNum = (0, util_1.modeToNumber)(mode);
        const fileName = (0, util_1.pathToFilename)(path);
        const flagsNum = (0, util_1.flagsToNumber)(flags);
        this.wrapAsync(this.openBase, [fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK)], callback);
    }
    closeFile(file) {
        if (!this.fds[file.fd])
            return;
        this.openFiles--;
        delete this.fds[file.fd];
        this.releasedFds.push(file.fd);
    }
    closeSync(fd) {
        (0, util_1.validateFd)(fd);
        const file = this.getFileByFdOrThrow(fd, 'close');
        this.closeFile(file);
    }
    close(fd, callback) {
        (0, util_1.validateFd)(fd);
        this.wrapAsync(this.closeSync, [fd], callback);
    }
    openFileOrGetById(id, flagsNum, modeNum) {
        if (typeof id === 'number') {
            const file = this.fds[id];
            if (!file)
                throw (0, util_1.createError)(ENOENT);
            return file;
        }
        else {
            return this.openFile((0, util_1.pathToFilename)(id), flagsNum, modeNum);
        }
    }
    readBase(fd, buffer, offset, length, position) {
        if (buffer.byteLength < length) {
            throw (0, util_1.createError)(ERR_OUT_OF_RANGE, 'read', undefined, undefined, RangeError);
        }
        const file = this.getFileByFdOrThrow(fd);
        if (file.node.isSymlink()) {
            throw (0, util_1.createError)(EPERM, 'read', file.link.getPath());
        }
        return file.read(buffer, Number(offset), Number(length), position === -1 || typeof position !== 'number' ? undefined : position);
    }
    readSync(fd, buffer, offset, length, position) {
        (0, util_1.validateFd)(fd);
        return this.readBase(fd, buffer, offset, length, position);
    }
    read(fd, buffer, offset, length, position, callback) {
        (0, util_1.validateCallback)(callback);
        // This `if` branch is from Node.js
        if (length === 0) {
            return (0, queueMicrotask_1.default)(() => {
                if (callback)
                    callback(null, 0, buffer);
            });
        }
        (0, setImmediate_1.default)(() => {
            try {
                const bytes = this.readBase(fd, buffer, offset, length, position);
                callback(null, bytes, buffer);
            }
            catch (err) {
                callback(err);
            }
        });
    }
    readvBase(fd, buffers, position) {
        const file = this.getFileByFdOrThrow(fd);
        let p = position !== null && position !== void 0 ? position : undefined;
        if (p === -1) {
            p = undefined;
        }
        let bytesRead = 0;
        for (const buffer of buffers) {
            const bytes = file.read(buffer, 0, buffer.byteLength, p);
            p = undefined;
            bytesRead += bytes;
            if (bytes < buffer.byteLength)
                break;
        }
        return bytesRead;
    }
    readv(fd, buffers, a, b) {
        let position = a;
        let callback = b;
        if (typeof a === 'function') {
            position = null;
            callback = a;
        }
        (0, util_1.validateCallback)(callback);
        (0, setImmediate_1.default)(() => {
            try {
                const bytes = this.readvBase(fd, buffers, position);
                callback(null, bytes, buffers);
            }
            catch (err) {
                callback(err);
            }
        });
    }
    readvSync(fd, buffers, position) {
        (0, util_1.validateFd)(fd);
        return this.readvBase(fd, buffers, position);
    }
    readFileBase(id, flagsNum, encoding) {
        let result;
        const isUserFd = typeof id === 'number';
        const userOwnsFd = isUserFd && (0, util_1.isFd)(id);
        let fd;
        if (userOwnsFd)
            fd = id;
        else {
            const filename = (0, util_1.pathToFilename)(id);
            const steps = filenameToSteps(filename);
            const link = this.getResolvedLink(steps);
            if (link) {
                const node = link.getNode();
                if (node.isDirectory())
                    throw (0, util_1.createError)(EISDIR, 'open', link.getPath());
            }
            fd = this.openSync(id, flagsNum);
        }
        try {
            result = (0, util_1.bufferToEncoding)(this.getFileByFdOrThrow(fd).getBuffer(), encoding);
        }
        finally {
            if (!userOwnsFd) {
                this.closeSync(fd);
            }
        }
        return result;
    }
    readFileSync(file, options) {
        const opts = (0, options_1.getReadFileOptions)(options);
        const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
        return this.readFileBase(file, flagsNum, opts.encoding);
    }
    readFile(id, a, b) {
        const [opts, callback] = (0, options_1.optsAndCbGenerator)(options_1.getReadFileOptions)(a, b);
        const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
        this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
    }
    writeBase(fd, buf, offset, length, position) {
        const file = this.getFileByFdOrThrow(fd, 'write');
        if (file.node.isSymlink()) {
            throw (0, util_1.createError)(EBADF, 'write', file.link.getPath());
        }
        return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
    }
    writeSync(fd, a, b, c, d) {
        const [, buf, offset, length, position] = (0, util_1.getWriteSyncArgs)(fd, a, b, c, d);
        return this.writeBase(fd, buf, offset, length, position);
    }
    write(fd, a, b, c, d, e) {
        const [, asStr, buf, offset, length, position, cb] = (0, util_1.getWriteArgs)(fd, a, b, c, d, e);
        (0, setImmediate_1.default)(() => {
            try {
                const bytes = this.writeBase(fd, buf, offset, length, position);
                if (!asStr) {
                    cb(null, bytes, buf);
                }
                else {
                    cb(null, bytes, a);
                }
            }
            catch (err) {
                cb(err);
            }
        });
    }
    writevBase(fd, buffers, position) {
        const file = this.getFileByFdOrThrow(fd);
        let p = position !== null && position !== void 0 ? position : undefined;
        if (p === -1) {
            p = undefined;
        }
        let bytesWritten = 0;
        for (const buffer of buffers) {
            const nodeBuf = buffer_1.Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const bytes = file.write(nodeBuf, 0, nodeBuf.byteLength, p);
            p = undefined;
            bytesWritten += bytes;
            if (bytes < nodeBuf.byteLength)
                break;
        }
        return bytesWritten;
    }
    writev(fd, buffers, a, b) {
        let position = a;
        let callback = b;
        if (typeof a === 'function') {
            position = null;
            callback = a;
        }
        (0, util_1.validateCallback)(callback);
        (0, setImmediate_1.default)(() => {
            try {
                const bytes = this.writevBase(fd, buffers, position);
                callback(null, bytes, buffers);
            }
            catch (err) {
                callback(err);
            }
        });
    }
    writevSync(fd, buffers, position) {
        (0, util_1.validateFd)(fd);
        return this.writevBase(fd, buffers, position);
    }
    writeFileBase(id, buf, flagsNum, modeNum) {
        // console.log('writeFileBase', id, buf, flagsNum, modeNum);
        // const node = this.getNodeByIdOrCreate(id, flagsNum, modeNum);
        // node.setBuffer(buf);
        const isUserFd = typeof id === 'number';
        let fd;
        if (isUserFd)
            fd = id;
        else {
            fd = this.openBase((0, util_1.pathToFilename)(id), flagsNum, modeNum);
            // fd = this.openSync(id as PathLike, flagsNum, modeNum);
        }
        let offset = 0;
        let length = buf.length;
        let position = flagsNum & O_APPEND ? undefined : 0;
        try {
            while (length > 0) {
                const written = this.writeSync(fd, buf, offset, length, position);
                offset += written;
                length -= written;
                if (position !== undefined)
                    position += written;
            }
        }
        finally {
            if (!isUserFd)
                this.closeSync(fd);
        }
    }
    writeFileSync(id, data, options) {
        const opts = (0, options_1.getWriteFileOptions)(options);
        const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
        const modeNum = (0, util_1.modeToNumber)(opts.mode);
        const buf = (0, util_1.dataToBuffer)(data, opts.encoding);
        this.writeFileBase(id, buf, flagsNum, modeNum);
    }
    writeFile(id, data, a, b) {
        let options = a;
        let callback = b;
        if (typeof a === 'function') {
            options = options_1.writeFileDefaults;
            callback = a;
        }
        const cb = (0, util_1.validateCallback)(callback);
        const opts = (0, options_1.getWriteFileOptions)(options);
        const flagsNum = (0, util_1.flagsToNumber)(opts.flag);
        const modeNum = (0, util_1.modeToNumber)(opts.mode);
        const buf = (0, util_1.dataToBuffer)(data, opts.encoding);
        this.wrapAsync(this.writeFileBase, [id, buf, flagsNum, modeNum], cb);
    }
    linkBase(filename1, filename2) {
        const steps1 = filenameToSteps(filename1);
        const link1 = this.getLink(steps1);
        if (!link1)
            throw (0, util_1.createError)(ENOENT, 'link', filename1, filename2);
        const steps2 = filenameToSteps(filename2);
        // Check new link directory exists.
        const dir2 = this.getLinkParent(steps2);
        if (!dir2)
            throw (0, util_1.createError)(ENOENT, 'link', filename1, filename2);
        const name = steps2[steps2.length - 1];
        // Check if new file already exists.
        if (dir2.getChild(name))
            throw (0, util_1.createError)(EEXIST, 'link', filename1, filename2);
        const node = link1.getNode();
        node.nlink++;
        dir2.createChild(name, node);
    }
    copyFileBase(src, dest, flags) {
        const buf = this.readFileSync(src);
        if (flags & COPYFILE_EXCL) {
            if (this.existsSync(dest)) {
                throw (0, util_1.createError)(EEXIST, 'copyFile', src, dest);
            }
        }
        if (flags & COPYFILE_FICLONE_FORCE) {
            throw (0, util_1.createError)(ENOSYS, 'copyFile', src, dest);
        }
        this.writeFileBase(dest, buf, constants_2.FLAGS.w, 438 /* MODE.DEFAULT */);
    }
    copyFileSync(src, dest, flags) {
        const srcFilename = (0, util_1.pathToFilename)(src);
        const destFilename = (0, util_1.pathToFilename)(dest);
        return this.copyFileBase(srcFilename, destFilename, (flags || 0) | 0);
    }
    copyFile(src, dest, a, b) {
        const srcFilename = (0, util_1.pathToFilename)(src);
        const destFilename = (0, util_1.pathToFilename)(dest);
        let flags;
        let callback;
        if (typeof a === 'function') {
            flags = 0;
            callback = a;
        }
        else {
            flags = a;
            callback = b;
        }
        (0, util_1.validateCallback)(callback);
        this.wrapAsync(this.copyFileBase, [srcFilename, destFilename, flags], callback);
    }
    linkSync(existingPath, newPath) {
        const existingPathFilename = (0, util_1.pathToFilename)(existingPath);
        const newPathFilename = (0, util_1.pathToFilename)(newPath);
        this.linkBase(existingPathFilename, newPathFilename);
    }
    link(existingPath, newPath, callback) {
        const existingPathFilename = (0, util_1.pathToFilename)(existingPath);
        const newPathFilename = (0, util_1.pathToFilename)(newPath);
        this.wrapAsync(this.linkBase, [existingPathFilename, newPathFilename], callback);
    }
    unlinkBase(filename) {
        const steps = filenameToSteps(filename);
        const link = this.getLink(steps);
        if (!link)
            throw (0, util_1.createError)(ENOENT, 'unlink', filename);
        // TODO: Check if it is file, dir, other...
        if (link.length)
            throw Error('Dir not empty...');
        this.deleteLink(link);
        const node = link.getNode();
        node.nlink--;
        // When all hard links to i-node are deleted, remove the i-node, too.
        if (node.nlink <= 0) {
            this.deleteNode(node);
        }
    }
    unlinkSync(path) {
        const filename = (0, util_1.pathToFilename)(path);
        this.unlinkBase(filename);
    }
    unlink(path, callback) {
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.unlinkBase, [filename], callback);
    }
    symlinkBase(targetFilename, pathFilename) {
        const pathSteps = filenameToSteps(pathFilename);
        // Check if directory exists, where we about to create a symlink.
        const dirLink = this.getLinkParent(pathSteps);
        if (!dirLink)
            throw (0, util_1.createError)(ENOENT, 'symlink', targetFilename, pathFilename);
        const name = pathSteps[pathSteps.length - 1];
        // Check if new file already exists.
        if (dirLink.getChild(name))
            throw (0, util_1.createError)(EEXIST, 'symlink', targetFilename, pathFilename);
        // Create symlink.
        const symlink = dirLink.createChild(name);
        symlink.getNode().makeSymlink(filenameToSteps(targetFilename));
        return symlink;
    }
    // `type` argument works only on Windows.
    symlinkSync(target, path, type) {
        const targetFilename = (0, util_1.pathToFilename)(target);
        const pathFilename = (0, util_1.pathToFilename)(path);
        this.symlinkBase(targetFilename, pathFilename);
    }
    symlink(target, path, a, b) {
        const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
        const targetFilename = (0, util_1.pathToFilename)(target);
        const pathFilename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
    }
    realpathBase(filename, encoding) {
        const steps = filenameToSteps(filename);
        const realLink = this.getResolvedLink(steps);
        if (!realLink)
            throw (0, util_1.createError)(ENOENT, 'realpath', filename);
        return (0, encoding_1.strToEncoding)(realLink.getPath() || '/', encoding);
    }
    realpathSync(path, options) {
        return this.realpathBase((0, util_1.pathToFilename)(path), (0, options_1.getRealpathOptions)(options).encoding);
    }
    realpath(path, a, b) {
        const [opts, callback] = (0, options_1.getRealpathOptsAndCb)(a, b);
        const pathFilename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.realpathBase, [pathFilename, opts.encoding], callback);
    }
    lstatBase(filename, bigint = false, throwIfNoEntry = false) {
        const link = this.getLink(filenameToSteps(filename));
        if (link) {
            return Stats_1.default.build(link.getNode(), bigint);
        }
        else if (!throwIfNoEntry) {
            return undefined;
        }
        else {
            throw (0, util_1.createError)(ENOENT, 'lstat', filename);
        }
    }
    lstatSync(path, options) {
        const { throwIfNoEntry = true, bigint = false } = (0, options_1.getStatOptions)(options);
        return this.lstatBase((0, util_1.pathToFilename)(path), bigint, throwIfNoEntry);
    }
    lstat(path, a, b) {
        const [{ throwIfNoEntry = true, bigint = false }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this.lstatBase, [(0, util_1.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    statBase(filename, bigint = false, throwIfNoEntry = true) {
        const link = this.getResolvedLink(filenameToSteps(filename));
        if (link) {
            return Stats_1.default.build(link.getNode(), bigint);
        }
        else if (!throwIfNoEntry) {
            return undefined;
        }
        else {
            throw (0, util_1.createError)(ENOENT, 'stat', filename);
        }
    }
    statSync(path, options) {
        const { bigint = true, throwIfNoEntry = true } = (0, options_1.getStatOptions)(options);
        return this.statBase((0, util_1.pathToFilename)(path), bigint, throwIfNoEntry);
    }
    stat(path, a, b) {
        const [{ bigint = false, throwIfNoEntry = true }, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this.statBase, [(0, util_1.pathToFilename)(path), bigint, throwIfNoEntry], callback);
    }
    fstatBase(fd, bigint = false) {
        const file = this.getFileByFd(fd);
        if (!file)
            throw (0, util_1.createError)(EBADF, 'fstat');
        return Stats_1.default.build(file.node, bigint);
    }
    fstatSync(fd, options) {
        return this.fstatBase(fd, (0, options_1.getStatOptions)(options).bigint);
    }
    fstat(fd, a, b) {
        const [opts, callback] = (0, options_1.getStatOptsAndCb)(a, b);
        this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
    }
    renameBase(oldPathFilename, newPathFilename) {
        const link = this.getLink(filenameToSteps(oldPathFilename));
        if (!link)
            throw (0, util_1.createError)(ENOENT, 'rename', oldPathFilename, newPathFilename);
        // TODO: Check if it is directory, if non-empty, we cannot move it, right?
        const newPathSteps = filenameToSteps(newPathFilename);
        // Check directory exists for the new location.
        const newPathDirLink = this.getLinkParent(newPathSteps);
        if (!newPathDirLink)
            throw (0, util_1.createError)(ENOENT, 'rename', oldPathFilename, newPathFilename);
        // TODO: Also treat cases with directories and symbolic links.
        // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html
        // Remove hard link from old folder.
        const oldLinkParent = link.parent;
        if (oldLinkParent) {
            oldLinkParent.deleteChild(link);
        }
        // Rename should overwrite the new path, if that exists.
        const name = newPathSteps[newPathSteps.length - 1];
        link.name = name;
        link.steps = [...newPathDirLink.steps, name];
        newPathDirLink.setChild(link.getName(), link);
    }
    renameSync(oldPath, newPath) {
        const oldPathFilename = (0, util_1.pathToFilename)(oldPath);
        const newPathFilename = (0, util_1.pathToFilename)(newPath);
        this.renameBase(oldPathFilename, newPathFilename);
    }
    rename(oldPath, newPath, callback) {
        const oldPathFilename = (0, util_1.pathToFilename)(oldPath);
        const newPathFilename = (0, util_1.pathToFilename)(newPath);
        this.wrapAsync(this.renameBase, [oldPathFilename, newPathFilename], callback);
    }
    existsBase(filename) {
        return !!this.statBase(filename);
    }
    existsSync(path) {
        try {
            return this.existsBase((0, util_1.pathToFilename)(path));
        }
        catch (err) {
            return false;
        }
    }
    exists(path, callback) {
        const filename = (0, util_1.pathToFilename)(path);
        if (typeof callback !== 'function')
            throw Error(constants_2.ERRSTR.CB);
        (0, setImmediate_1.default)(() => {
            try {
                callback(this.existsBase(filename));
            }
            catch (err) {
                callback(false);
            }
        });
    }
    accessBase(filename, mode) {
        const link = this.getLinkOrThrow(filename, 'access');
        // TODO: Verify permissions
    }
    accessSync(path, mode = F_OK) {
        const filename = (0, util_1.pathToFilename)(path);
        mode = mode | 0;
        this.accessBase(filename, mode);
    }
    access(path, a, b) {
        let mode = F_OK;
        let callback;
        if (typeof a !== 'function') {
            mode = a | 0; // cast to number
            callback = (0, util_1.validateCallback)(b);
        }
        else {
            callback = a;
        }
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.accessBase, [filename, mode], callback);
    }
    appendFileSync(id, data, options) {
        const opts = (0, options_1.getAppendFileOpts)(options);
        // force append behavior when using a supplied file descriptor
        if (!opts.flag || (0, util_1.isFd)(id))
            opts.flag = 'a';
        this.writeFileSync(id, data, opts);
    }
    appendFile(id, data, a, b) {
        const [opts, callback] = (0, options_1.getAppendFileOptsAndCb)(a, b);
        // force append behavior when using a supplied file descriptor
        if (!opts.flag || (0, util_1.isFd)(id))
            opts.flag = 'a';
        this.writeFile(id, data, opts, callback);
    }
    readdirBase(filename, options) {
        var _a, _b;
        const steps = filenameToSteps(filename);
        const link = this.getResolvedLink(steps);
        if (!link)
            throw (0, util_1.createError)(ENOENT, 'readdir', filename);
        const node = link.getNode();
        if (!node.isDirectory())
            throw (0, util_1.createError)(ENOTDIR, 'scandir', filename);
        if (options.withFileTypes) {
            const list = [];
            for (const name of link.children.keys()) {
                const child = link.getChild(name);
                if (!child || name === '.' || name === '..') {
                    continue;
                }
                list.push(Dirent_1.default.build(child, options.encoding));
            }
            if (!util_1.isWin && options.encoding !== 'buffer')
                list.sort((a, b) => {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
            return list;
        }
        const list = [];
        for (const name of link.children.keys()) {
            if (name === '.' || name === '..') {
                continue;
            }
            list.push((0, encoding_1.strToEncoding)((_b = (_a = link.children[name]) === null || _a === void 0 ? void 0 : _a.getName()) !== null && _b !== void 0 ? _b : name, options.encoding));
        }
        if (!util_1.isWin && options.encoding !== 'buffer')
            list.sort();
        return list;
    }
    readdirSync(path, options) {
        const opts = (0, options_1.getReaddirOptions)(options);
        const filename = (0, util_1.pathToFilename)(path);
        return this.readdirBase(filename, opts);
    }
    readdir(path, a, b) {
        const [options, callback] = (0, options_1.getReaddirOptsAndCb)(a, b);
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.readdirBase, [filename, options], callback);
    }
    readlinkBase(filename, encoding) {
        const link = this.getLinkOrThrow(filename, 'readlink');
        const node = link.getNode();
        if (!node.isSymlink())
            throw (0, util_1.createError)(EINVAL, 'readlink', filename);
        const str = sep + node.symlink.join(sep);
        return (0, encoding_1.strToEncoding)(str, encoding);
    }
    readlinkSync(path, options) {
        const opts = (0, options_1.getDefaultOpts)(options);
        const filename = (0, util_1.pathToFilename)(path);
        return this.readlinkBase(filename, opts.encoding);
    }
    readlink(path, a, b) {
        const [opts, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.readlinkBase, [filename, opts.encoding], callback);
    }
    fsyncBase(fd) {
        this.getFileByFdOrThrow(fd, 'fsync');
    }
    fsyncSync(fd) {
        this.fsyncBase(fd);
    }
    fsync(fd, callback) {
        this.wrapAsync(this.fsyncBase, [fd], callback);
    }
    fdatasyncBase(fd) {
        this.getFileByFdOrThrow(fd, 'fdatasync');
    }
    fdatasyncSync(fd) {
        this.fdatasyncBase(fd);
    }
    fdatasync(fd, callback) {
        this.wrapAsync(this.fdatasyncBase, [fd], callback);
    }
    ftruncateBase(fd, len) {
        const file = this.getFileByFdOrThrow(fd, 'ftruncate');
        file.truncate(len);
    }
    ftruncateSync(fd, len) {
        this.ftruncateBase(fd, len);
    }
    ftruncate(fd, a, b) {
        const len = typeof a === 'number' ? a : 0;
        const callback = (0, util_1.validateCallback)(typeof a === 'number' ? b : a);
        this.wrapAsync(this.ftruncateBase, [fd, len], callback);
    }
    truncateBase(path, len) {
        const fd = this.openSync(path, 'r+');
        try {
            this.ftruncateSync(fd, len);
        }
        finally {
            this.closeSync(fd);
        }
    }
    /**
     * `id` should be a file descriptor or a path. `id` as file descriptor will
     * not be supported soon.
     */
    truncateSync(id, len) {
        if ((0, util_1.isFd)(id))
            return this.ftruncateSync(id, len);
        this.truncateBase(id, len);
    }
    truncate(id, a, b) {
        const len = typeof a === 'number' ? a : 0;
        const callback = (0, util_1.validateCallback)(typeof a === 'number' ? b : a);
        if ((0, util_1.isFd)(id))
            return this.ftruncate(id, len, callback);
        this.wrapAsync(this.truncateBase, [id, len], callback);
    }
    futimesBase(fd, atime, mtime) {
        const file = this.getFileByFdOrThrow(fd, 'futimes');
        const node = file.node;
        node.atime = new Date(atime * 1000);
        node.mtime = new Date(mtime * 1000);
    }
    futimesSync(fd, atime, mtime) {
        this.futimesBase(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
    }
    futimes(fd, atime, mtime, callback) {
        this.wrapAsync(this.futimesBase, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
    }
    utimesBase(filename, atime, mtime) {
        const fd = this.openSync(filename, 'r');
        try {
            this.futimesBase(fd, atime, mtime);
        }
        finally {
            this.closeSync(fd);
        }
    }
    utimesSync(path, atime, mtime) {
        this.utimesBase((0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime));
    }
    utimes(path, atime, mtime, callback) {
        this.wrapAsync(this.utimesBase, [(0, util_1.pathToFilename)(path), toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
    }
    mkdirBase(filename, modeNum) {
        const steps = filenameToSteps(filename);
        // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
        if (!steps.length) {
            throw (0, util_1.createError)(EEXIST, 'mkdir', filename);
        }
        const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');
        // Check path already exists.
        const name = steps[steps.length - 1];
        if (dir.getChild(name))
            throw (0, util_1.createError)(EEXIST, 'mkdir', filename);
        dir.createChild(name, this.createNode(true, modeNum));
    }
    /**
     * Creates directory tree recursively.
     * @param filename
     * @param modeNum
     */
    mkdirpBase(filename, modeNum) {
        const fullPath = resolve(filename);
        const fullPathSansSlash = fullPath.substring(1);
        const steps = !fullPathSansSlash ? [] : fullPathSansSlash.split(sep);
        let link = this.root;
        let created = false;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (!link.getNode().isDirectory())
                throw (0, util_1.createError)(ENOTDIR, 'mkdir', link.getPath());
            const child = link.getChild(step);
            if (child) {
                if (child.getNode().isDirectory())
                    link = child;
                else
                    throw (0, util_1.createError)(ENOTDIR, 'mkdir', child.getPath());
            }
            else {
                link = link.createChild(step, this.createNode(true, modeNum));
                created = true;
            }
        }
        return created ? fullPath : undefined;
    }
    mkdirSync(path, options) {
        const opts = (0, options_1.getMkdirOptions)(options);
        const modeNum = (0, util_1.modeToNumber)(opts.mode, 0o777);
        const filename = (0, util_1.pathToFilename)(path);
        if (opts.recursive)
            return this.mkdirpBase(filename, modeNum);
        this.mkdirBase(filename, modeNum);
    }
    mkdir(path, a, b) {
        const opts = (0, options_1.getMkdirOptions)(a);
        const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
        const modeNum = (0, util_1.modeToNumber)(opts.mode, 0o777);
        const filename = (0, util_1.pathToFilename)(path);
        if (opts.recursive)
            this.wrapAsync(this.mkdirpBase, [filename, modeNum], callback);
        else
            this.wrapAsync(this.mkdirBase, [filename, modeNum], callback);
    }
    mkdtempBase(prefix, encoding, retry = 5) {
        const filename = prefix + (0, util_1.genRndStr6)();
        try {
            this.mkdirBase(filename, 511 /* MODE.DIR */);
            return (0, encoding_1.strToEncoding)(filename, encoding);
        }
        catch (err) {
            if (err.code === EEXIST) {
                if (retry > 1)
                    return this.mkdtempBase(prefix, encoding, retry - 1);
                else
                    throw Error('Could not create temp dir.');
            }
            else
                throw err;
        }
    }
    mkdtempSync(prefix, options) {
        const { encoding } = (0, options_1.getDefaultOpts)(options);
        if (!prefix || typeof prefix !== 'string')
            throw new TypeError('filename prefix is required');
        (0, util_1.nullCheck)(prefix);
        return this.mkdtempBase(prefix, encoding);
    }
    mkdtemp(prefix, a, b) {
        const [{ encoding }, callback] = (0, options_1.getDefaultOptsAndCb)(a, b);
        if (!prefix || typeof prefix !== 'string')
            throw new TypeError('filename prefix is required');
        if (!(0, util_1.nullCheck)(prefix))
            return;
        this.wrapAsync(this.mkdtempBase, [prefix, encoding], callback);
    }
    rmdirBase(filename, options) {
        const opts = (0, options_1.getRmdirOptions)(options);
        const link = this.getLinkAsDirOrThrow(filename, 'rmdir');
        // Check directory is empty.
        if (link.length && !opts.recursive)
            throw (0, util_1.createError)(ENOTEMPTY, 'rmdir', filename);
        this.deleteLink(link);
    }
    rmdirSync(path, options) {
        this.rmdirBase((0, util_1.pathToFilename)(path), options);
    }
    rmdir(path, a, b) {
        const opts = (0, options_1.getRmdirOptions)(a);
        const callback = (0, util_1.validateCallback)(typeof a === 'function' ? a : b);
        this.wrapAsync(this.rmdirBase, [(0, util_1.pathToFilename)(path), opts], callback);
    }
    rmBase(filename, options = {}) {
        const link = this.getResolvedLink(filename);
        if (!link) {
            // "stat" is used to match Node's native error message.
            if (!options.force)
                throw (0, util_1.createError)(ENOENT, 'stat', filename);
            return;
        }
        if (link.getNode().isDirectory()) {
            if (!options.recursive) {
                throw (0, util_1.createError)(ERR_FS_EISDIR, 'rm', filename);
            }
        }
        this.deleteLink(link);
    }
    rmSync(path, options) {
        this.rmBase((0, util_1.pathToFilename)(path), options);
    }
    rm(path, a, b) {
        const [opts, callback] = (0, options_1.getRmOptsAndCb)(a, b);
        this.wrapAsync(this.rmBase, [(0, util_1.pathToFilename)(path), opts], callback);
    }
    fchmodBase(fd, modeNum) {
        const file = this.getFileByFdOrThrow(fd, 'fchmod');
        file.chmod(modeNum);
    }
    fchmodSync(fd, mode) {
        this.fchmodBase(fd, (0, util_1.modeToNumber)(mode));
    }
    fchmod(fd, mode, callback) {
        this.wrapAsync(this.fchmodBase, [fd, (0, util_1.modeToNumber)(mode)], callback);
    }
    chmodBase(filename, modeNum) {
        const fd = this.openSync(filename, 'r');
        try {
            this.fchmodBase(fd, modeNum);
        }
        finally {
            this.closeSync(fd);
        }
    }
    chmodSync(path, mode) {
        const modeNum = (0, util_1.modeToNumber)(mode);
        const filename = (0, util_1.pathToFilename)(path);
        this.chmodBase(filename, modeNum);
    }
    chmod(path, mode, callback) {
        const modeNum = (0, util_1.modeToNumber)(mode);
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.chmodBase, [filename, modeNum], callback);
    }
    lchmodBase(filename, modeNum) {
        const fd = this.openBase(filename, O_RDWR, 0, false);
        try {
            this.fchmodBase(fd, modeNum);
        }
        finally {
            this.closeSync(fd);
        }
    }
    lchmodSync(path, mode) {
        const modeNum = (0, util_1.modeToNumber)(mode);
        const filename = (0, util_1.pathToFilename)(path);
        this.lchmodBase(filename, modeNum);
    }
    lchmod(path, mode, callback) {
        const modeNum = (0, util_1.modeToNumber)(mode);
        const filename = (0, util_1.pathToFilename)(path);
        this.wrapAsync(this.lchmodBase, [filename, modeNum], callback);
    }
    fchownBase(fd, uid, gid) {
        this.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
    }
    fchownSync(fd, uid, gid) {
        validateUid(uid);
        validateGid(gid);
        this.fchownBase(fd, uid, gid);
    }
    fchown(fd, uid, gid, callback) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.fchownBase, [fd, uid, gid], callback);
    }
    chownBase(filename, uid, gid) {
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
    chownSync(path, uid, gid) {
        validateUid(uid);
        validateGid(gid);
        this.chownBase((0, util_1.pathToFilename)(path), uid, gid);
    }
    chown(path, uid, gid, callback) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.chownBase, [(0, util_1.pathToFilename)(path), uid, gid], callback);
    }
    lchownBase(filename, uid, gid) {
        this.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
    }
    lchownSync(path, uid, gid) {
        validateUid(uid);
        validateGid(gid);
        this.lchownBase((0, util_1.pathToFilename)(path), uid, gid);
    }
    lchown(path, uid, gid, callback) {
        validateUid(uid);
        validateGid(gid);
        this.wrapAsync(this.lchownBase, [(0, util_1.pathToFilename)(path), uid, gid], callback);
    }
    watchFile(path, a, b) {
        const filename = (0, util_1.pathToFilename)(path);
        let options = a;
        let listener = b;
        if (typeof options === 'function') {
            listener = a;
            options = null;
        }
        if (typeof listener !== 'function') {
            throw Error('"watchFile()" requires a listener function');
        }
        let interval = 5007;
        let persistent = true;
        if (options && typeof options === 'object') {
            if (typeof options.interval === 'number')
                interval = options.interval;
            if (typeof options.persistent === 'boolean')
                persistent = options.persistent;
        }
        let watcher = this.statWatchers[filename];
        if (!watcher) {
            watcher = new this.StatWatcher();
            watcher.start(filename, persistent, interval);
            this.statWatchers[filename] = watcher;
        }
        watcher.addListener('change', listener);
        return watcher;
    }
    unwatchFile(path, listener) {
        const filename = (0, util_1.pathToFilename)(path);
        const watcher = this.statWatchers[filename];
        if (!watcher)
            return;
        if (typeof listener === 'function') {
            watcher.removeListener('change', listener);
        }
        else {
            watcher.removeAllListeners('change');
        }
        if (watcher.listenerCount('change') === 0) {
            watcher.stop();
            delete this.statWatchers[filename];
        }
    }
    createReadStream(path, options) {
        return new this.ReadStream(path, options);
    }
    createWriteStream(path, options) {
        return new this.WriteStream(path, options);
    }
    // watch(path: PathLike): FSWatcher;
    // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
    watch(path, options, listener) {
        const filename = (0, util_1.pathToFilename)(path);
        let givenOptions = options;
        if (typeof options === 'function') {
            listener = options;
            givenOptions = null;
        }
        // tslint:disable-next-line prefer-const
        let { persistent, recursive, encoding } = (0, options_1.getDefaultOpts)(givenOptions);
        if (persistent === undefined)
            persistent = true;
        if (recursive === undefined)
            recursive = false;
        const watcher = new this.FSWatcher();
        watcher.start(filename, persistent, recursive, encoding);
        if (listener) {
            watcher.addListener('change', listener);
        }
        return watcher;
    }
}
exports.Volume = Volume;
/**
 * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
 * up, so here, in order not to conflict with them, we choose some big number and descrease
 * the file descriptor of every new opened file.
 * @type {number}
 * @todo This should not be static, right?
 */
Volume.fd = 0x7fffffff;
function emitStop(self) {
    self.emit('stop');
}
class StatWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this.onInterval = () => {
            try {
                const stats = this.vol.statSync(this.filename);
                if (this.hasChanged(stats)) {
                    this.emit('change', stats, this.prev);
                    this.prev = stats;
                }
            }
            finally {
                this.loop();
            }
        };
        this.vol = vol;
    }
    loop() {
        this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
    }
    hasChanged(stats) {
        // if(!this.prev) return false;
        if (stats.mtimeMs > this.prev.mtimeMs)
            return true;
        if (stats.nlink !== this.prev.nlink)
            return true;
        return false;
    }
    start(path, persistent = true, interval = 5007) {
        this.filename = (0, util_1.pathToFilename)(path);
        this.setTimeout = persistent
            ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global)
            : setTimeoutUnref_1.default;
        this.interval = interval;
        this.prev = this.vol.statSync(this.filename);
        this.loop();
    }
    stop() {
        clearTimeout(this.timeoutRef);
        (0, queueMicrotask_1.default)(() => {
            emitStop.call(this, this);
        });
    }
}
exports.StatWatcher = StatWatcher;
/* tslint:disable no-var-keyword prefer-const */
// ---------------------------------------- ReadStream
var pool;
function allocNewPool(poolSize) {
    pool = (0, buffer_1.bufferAllocUnsafe)(poolSize);
    pool.used = 0;
}
util.inherits(FsReadStream, stream_1.Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
    if (!(this instanceof FsReadStream))
        return new FsReadStream(vol, path, options);
    this._vol = vol;
    // a little bit bigger buffer and water marks by default
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    if (options.highWaterMark === undefined)
        options.highWaterMark = 64 * 1024;
    stream_1.Readable.call(this, options);
    this.path = (0, util_1.pathToFilename)(path);
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
        }
        else if (typeof this.end !== 'number') {
            throw new TypeError('"end" option must be a Number');
        }
        if (this.start > this.end) {
            throw new Error('"start" option must be <= "end" option');
        }
        this.pos = this.start;
    }
    if (typeof this.fd !== 'number')
        this.open();
    this.on('end', function () {
        if (this.autoClose) {
            if (this.destroy)
                this.destroy();
        }
    });
}
FsReadStream.prototype.open = function () {
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
        if (er) {
            if (self.autoClose) {
                if (self.destroy)
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
FsReadStream.prototype._read = function (n) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
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
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);
    // move the pool positions, and internal position for reading.
    if (this.pos !== undefined)
        this.pos += toRead;
    pool.used += toRead;
    function onread(er, bytesRead) {
        if (er) {
            if (self.autoClose && self.destroy) {
                self.destroy();
            }
            self.emit('error', er);
        }
        else {
            var b = null;
            if (bytesRead > 0) {
                self.bytesRead += bytesRead;
                b = thisPool.slice(start, start + bytesRead);
            }
            self.push(b);
        }
    }
};
FsReadStream.prototype._destroy = function (err, cb) {
    this.close(err2 => {
        cb(err || err2);
    });
};
FsReadStream.prototype.close = function (cb) {
    var _a;
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Readable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
    if (typeof ((_a = this._readableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
        this._readableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
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
util.inherits(FsWriteStream, stream_1.Writable);
exports.WriteStream = FsWriteStream;
function FsWriteStream(vol, path, options) {
    if (!(this instanceof FsWriteStream))
        return new FsWriteStream(vol, path, options);
    this._vol = vol;
    options = Object.assign({}, (0, options_1.getOptions)(options, {}));
    stream_1.Writable.call(this, options);
    this.path = (0, util_1.pathToFilename)(path);
    this.fd = options.fd === undefined ? null : options.fd;
    this.flags = options.flags === undefined ? 'w' : options.flags;
    this.mode = options.mode === undefined ? 0o666 : options.mode;
    this.start = options.start;
    this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
    this.pos = undefined;
    this.bytesWritten = 0;
    this.pending = true;
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
    this.once('finish', function () {
        if (this.autoClose) {
            this.close();
        }
    });
}
FsWriteStream.prototype.open = function () {
    this._vol.open(this.path, this.flags, this.mode, function (er, fd) {
        if (er) {
            if (this.autoClose && this.destroy) {
                this.destroy();
            }
            this.emit('error', er);
            return;
        }
        this.fd = fd;
        this.pending = false;
        this.emit('open', fd);
    }.bind(this));
};
FsWriteStream.prototype._write = function (data, encoding, cb) {
    if (!(data instanceof buffer_1.Buffer || data instanceof Uint8Array))
        return this.emit('error', new Error('Invalid data'));
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._write(data, encoding, cb);
        });
    }
    var self = this; // tslint:disable-line no-this-assignment
    this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.autoClose && self.destroy) {
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
FsWriteStream.prototype._writev = function (data, cb) {
    if (typeof this.fd !== 'number') {
        return this.once('open', function () {
            this._writev(data, cb);
        });
    }
    const self = this; // tslint:disable-line no-this-assignment
    const len = data.length;
    const chunks = new Array(len);
    var size = 0;
    for (var i = 0; i < len; i++) {
        var chunk = data[i].chunk;
        chunks[i] = chunk;
        size += chunk.length;
    }
    const buf = buffer_1.Buffer.concat(chunks);
    this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
        if (er) {
            if (self.destroy)
                self.destroy();
            return cb(er);
        }
        self.bytesWritten += bytes;
        cb();
    });
    if (this.pos !== undefined)
        this.pos += size;
};
FsWriteStream.prototype.close = function (cb) {
    var _a;
    if (cb)
        this.once('close', cb);
    if (this.closed || typeof this.fd !== 'number') {
        if (typeof this.fd !== 'number') {
            this.once('open', closeOnOpen);
            return;
        }
        return (0, queueMicrotask_1.default)(() => this.emit('close'));
    }
    // Since Node 18, there is only a getter for '.closed'.
    // The first branch mimics other setters from Writable.
    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
    if (typeof ((_a = this._writableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
        this._writableState.closed = true;
    }
    else {
        this.closed = true;
    }
    this._vol.close(this.fd, er => {
        if (er)
            this.emit('error', er);
        else
            this.emit('close');
    });
    this.fd = null;
};
FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;
// There is no shutdown() for files.
FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;
// ---------------------------------------- FSWatcher
class FSWatcher extends events_1.EventEmitter {
    constructor(vol) {
        super();
        this._filename = '';
        this._filenameEncoded = '';
        // _persistent: boolean = true;
        this._recursive = false;
        this._encoding = encoding_1.ENCODING_UTF8;
        // inode -> removers
        this._listenerRemovers = new Map();
        this._onParentChild = (link) => {
            if (link.getName() === this._getName()) {
                this._emit('rename');
            }
        };
        this._emit = (type) => {
            this.emit('change', type, this._filenameEncoded);
        };
        this._persist = () => {
            this._timer = setTimeout(this._persist, 1e6);
        };
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
    _getName() {
        return this._steps[this._steps.length - 1];
    }
    start(path, persistent = true, recursive = false, encoding = encoding_1.ENCODING_UTF8) {
        this._filename = (0, util_1.pathToFilename)(path);
        this._steps = filenameToSteps(this._filename);
        this._filenameEncoded = (0, encoding_1.strToEncoding)(this._filename);
        // this._persistent = persistent;
        this._recursive = recursive;
        this._encoding = encoding;
        try {
            this._link = this._vol.getLinkOrThrow(this._filename, 'FSWatcher');
        }
        catch (err) {
            const error = new Error(`watch ${this._filename} ${err.code}`);
            error.code = err.code;
            error.errno = err.code;
            throw error;
        }
        const watchLinkNodeChanged = (link) => {
            var _a;
            const filepath = link.getPath();
            const node = link.getNode();
            const onNodeChange = () => {
                let filename = relative(this._filename, filepath);
                if (!filename) {
                    filename = this._getName();
                }
                return this.emit('change', 'change', filename);
            };
            node.on('change', onNodeChange);
            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
            removers.push(() => node.removeListener('change', onNodeChange));
            this._listenerRemovers.set(node.ino, removers);
        };
        const watchLinkChildrenChanged = (link) => {
            var _a;
            const node = link.getNode();
            // when a new link added
            const onLinkChildAdd = (l) => {
                this.emit('change', 'rename', relative(this._filename, l.getPath()));
                setTimeout(() => {
                    // 1. watch changes of the new link-node
                    watchLinkNodeChanged(l);
                    // 2. watch changes of the new link-node's children
                    watchLinkChildrenChanged(l);
                });
            };
            // when a new link deleted
            const onLinkChildDelete = (l) => {
                // remove the listeners of the children nodes
                const removeLinkNodeListeners = (curLink) => {
                    const ino = curLink.getNode().ino;
                    const removers = this._listenerRemovers.get(ino);
                    if (removers) {
                        removers.forEach(r => r());
                        this._listenerRemovers.delete(ino);
                    }
                    for (const [name, childLink] of curLink.children.entries()) {
                        if (childLink && name !== '.' && name !== '..') {
                            removeLinkNodeListeners(childLink);
                        }
                    }
                };
                removeLinkNodeListeners(l);
                this.emit('change', 'rename', relative(this._filename, l.getPath()));
            };
            // children nodes changed
            for (const [name, childLink] of link.children.entries()) {
                if (childLink && name !== '.' && name !== '..') {
                    watchLinkNodeChanged(childLink);
                }
            }
            // link children add/remove
            link.on('child:add', onLinkChildAdd);
            link.on('child:delete', onLinkChildDelete);
            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
            removers.push(() => {
                link.removeListener('child:add', onLinkChildAdd);
                link.removeListener('child:delete', onLinkChildDelete);
            });
            if (recursive) {
                for (const [name, childLink] of link.children.entries()) {
                    if (childLink && name !== '.' && name !== '..') {
                        watchLinkChildrenChanged(childLink);
                    }
                }
            }
        };
        watchLinkNodeChanged(this._link);
        watchLinkChildrenChanged(this._link);
        const parent = this._link.parent;
        if (parent) {
            // parent.on('child:add', this._onParentChild);
            parent.setMaxListeners(parent.getMaxListeners() + 1);
            parent.on('child:delete', this._onParentChild);
        }
        if (persistent)
            this._persist();
    }
    close() {
        clearTimeout(this._timer);
        this._listenerRemovers.forEach(removers => {
            removers.forEach(r => r());
        });
        this._listenerRemovers.clear();
        const parent = this._link.parent;
        if (parent) {
            // parent.removeListener('child:add', this._onParentChild);
            parent.removeListener('child:delete', this._onParentChild);
        }
    }
}
exports.FSWatcher = FSWatcher;
//# sourceMappingURL=volume.js.map