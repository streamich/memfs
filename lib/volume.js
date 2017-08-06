"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var node_1 = require("./node");
var buffer_1 = require("buffer");
var setImmediate_1 = require("./setImmediate");
var process_1 = require("./process");
var extend = require('fast-extend');
var errors = require('./internal/errors');
var constants_1 = require("./constants");
var O_RDONLY = constants_1.constants.O_RDONLY, O_WRONLY = constants_1.constants.O_WRONLY, O_RDWR = constants_1.constants.O_RDWR, O_CREAT = constants_1.constants.O_CREAT, O_EXCL = constants_1.constants.O_EXCL, O_NOCTTY = constants_1.constants.O_NOCTTY, O_TRUNC = constants_1.constants.O_TRUNC, O_APPEND = constants_1.constants.O_APPEND, O_DIRECTORY = constants_1.constants.O_DIRECTORY, O_NOATIME = constants_1.constants.O_NOATIME, O_NOFOLLOW = constants_1.constants.O_NOFOLLOW, O_SYNC = constants_1.constants.O_SYNC, O_DIRECT = constants_1.constants.O_DIRECT, O_NONBLOCK = constants_1.constants.O_NONBLOCK, F_OK = constants_1.constants.F_OK, R_OK = constants_1.constants.R_OK, W_OK = constants_1.constants.W_OK, X_OK = constants_1.constants.X_OK;
var ENCODING_UTF8 = 'utf8';
var ERRSTR = {
    PATH_STR: 'path must be a string or Buffer',
    FD: 'file descriptor must be a unsigned 32-bit integer',
    MODE_INT: 'mode must be an int',
    CB: 'callback must be a function',
    UID: 'uid must be an unsigned int',
    GID: 'gid must be an unsigned int',
    LEN: 'len must be an integer',
    ATIME: 'atime must be an integer',
    MTIME: 'mtime must be an integer',
    PREFIX: 'filename prefix is required',
    BUFFER: 'buffer must be an instance of Buffer or StaticBuffer',
    OFFSET: 'offset must be an integer',
    LENGTH: 'length must be an integer',
    POSITION: 'position must be an integer',
};
var ERRSTR_OPTS = function (tipeof) { return "Expected options to be either an object or a string, but got " + tipeof + " instead"; };
function formatError(errorCode, func, path, path2) {
    if (func === void 0) { func = ''; }
    if (path === void 0) { path = ''; }
    if (path2 === void 0) { path2 = ''; }
    var pathFormatted = '';
    if (path)
        pathFormatted = " '" + path + "'";
    if (path2)
        pathFormatted += " -> '" + path2 + "'";
    switch (errorCode) {
        case 'ENOENT': return "ENOENT: no such file or directory, " + func + pathFormatted;
        case 'EBADF': return "EBADF: bad file descriptor, " + func + pathFormatted;
        case 'EINVAL': return "EINVAL: invalid argument, " + func + pathFormatted;
        case 'EPERM': return "EPERM: operation not permitted, " + func + pathFormatted;
        case 'EPROTO': return "EPROTO: protocol error, " + func + pathFormatted;
        case 'EEXIST': return "EEXIST: file already exists, " + func + pathFormatted;
        case 'EMFILE': return 'Too many open files';
        case 'EACCES':
        case 'EISDIR':
        case 'ENOTDIR':
        case 'ENOTEMPTY':
        default: return "Error occurred in " + func;
    }
}
function createError(errorCode, func, path, path2, Constructor) {
    if (func === void 0) { func = ''; }
    if (path === void 0) { path = ''; }
    if (path2 === void 0) { path2 = ''; }
    if (Constructor === void 0) { Constructor = Error; }
    var error = new Constructor(formatError(errorCode, func, path, path2));
    error.code = errorCode;
    return error;
}
function throwError(errorCode, func, path, path2, Constructor) {
    if (func === void 0) { func = ''; }
    if (path === void 0) { path = ''; }
    if (path2 === void 0) { path2 = ''; }
    if (Constructor === void 0) { Constructor = Error; }
    throw createError(errorCode, func, path, path2, Constructor);
}
function pathOrError(path, encoding) {
    if (buffer_1.Buffer.isBuffer(path))
        path = path.toString(encoding);
    if (typeof path !== 'string')
        return TypeError(ERRSTR.PATH_STR);
    return path;
}
function validPathOrThrow(path, encoding) {
    var p = pathOrError(path, encoding);
    if (p instanceof TypeError)
        throw p;
    else
        return p;
}
function assertFd(fd) {
    if (typeof fd !== 'number')
        throw TypeError(ERRSTR.FD);
}
var FLAGS;
(function (FLAGS) {
    FLAGS[FLAGS["r"] = O_RDONLY] = "r";
    FLAGS[FLAGS["r+"] = O_RDWR] = "r+";
    FLAGS[FLAGS["rs"] = O_RDONLY | O_SYNC] = "rs";
    FLAGS[FLAGS["sr"] = FLAGS.rs] = "sr";
    FLAGS[FLAGS["rs+"] = O_RDWR | O_SYNC] = "rs+";
    FLAGS[FLAGS["sr+"] = FLAGS['rs+']] = "sr+";
    FLAGS[FLAGS["w"] = O_WRONLY | O_CREAT | O_TRUNC] = "w";
    FLAGS[FLAGS["wx"] = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL] = "wx";
    FLAGS[FLAGS["xw"] = FLAGS.wx] = "xw";
    FLAGS[FLAGS["w+"] = O_RDWR | O_CREAT | O_TRUNC] = "w+";
    FLAGS[FLAGS["wx+"] = O_RDWR | O_CREAT | O_TRUNC | O_EXCL] = "wx+";
    FLAGS[FLAGS["xw+"] = FLAGS['wx+']] = "xw+";
    FLAGS[FLAGS["a"] = O_WRONLY | O_APPEND | O_CREAT] = "a";
    FLAGS[FLAGS["ax"] = O_WRONLY | O_APPEND | O_CREAT | O_EXCL] = "ax";
    FLAGS[FLAGS["xa"] = FLAGS.ax] = "xa";
    FLAGS[FLAGS["a+"] = O_RDWR | O_APPEND | O_CREAT] = "a+";
    FLAGS[FLAGS["ax+"] = O_RDWR | O_APPEND | O_CREAT | O_EXCL] = "ax+";
    FLAGS[FLAGS["xa+"] = FLAGS['ax+']] = "xa+";
})(FLAGS = exports.FLAGS || (exports.FLAGS = {}));
function flagsToNumber(flags) {
    if (typeof flags === 'number')
        return flags;
    if (typeof flags === 'string') {
        var flagsNum = FLAGS[flags];
        if (typeof flagsNum !== 'undefined')
            return flagsNum;
    }
    throw new errors.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
}
exports.flagsToNumber = flagsToNumber;
function assertEncoding(encoding) {
    if (encoding && !buffer_1.Buffer.isEncoding(encoding))
        throw Error('Unknown encoding: ' + encoding);
}
function getOptions(defaults, options) {
    if (!options)
        return defaults;
    else {
        var tipeof = typeof options;
        switch (tipeof) {
            case 'string': return extend({}, defaults, { encoding: options });
            case 'object': return extend({}, defaults, options);
            default: throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }
}
function optsGenerator(defaults) {
    return function (options) { return getOptions(defaults, options); };
}
function validateCallback(callback) {
    if (typeof callback !== 'function')
        throw TypeError(ERRSTR.CB);
    return callback;
}
function optsAndCbGenerator(getOpts) {
    return function (options, callback) { return typeof options === 'function'
        ? [getOpts(), options]
        : [getOpts(options), validateCallback(callback)]; };
}
var optsDefaults = {
    encoding: 'utf8',
};
var getDefaultOptions = optsGenerator(optsDefaults);
var readFileOptsDefaults = {
    flag: 'r',
};
var getReadFileOptions = optsGenerator(readFileOptsDefaults);
var writeFileDefaults = {
    encoding: 'utf8',
    mode: 438,
    flag: FLAGS[FLAGS.w],
};
var getWriteFileOptions = optsGenerator(writeFileDefaults);
var appendFileDefaults = {
    encoding: 'utf8',
    mode: 438,
    flag: FLAGS[FLAGS.a],
};
var getAppendFileOptions = optsGenerator(appendFileDefaults);
var realpathDefaults = optsDefaults;
var getRealpathOptions = optsGenerator(realpathDefaults);
var getRealpathOptsAndCb = optsAndCbGenerator(getRealpathOptions);
function pathToFilename(path) {
    if ((typeof path !== 'string') && !buffer_1.Buffer.isBuffer(path))
        throw new TypeError(ERRSTR.PATH_STR);
    var pathString = String(path);
    nullCheck(pathString);
    return pathString;
}
exports.pathToFilename = pathToFilename;
function filenameToSteps(filename) {
    var fullPath = path_1.resolve(filename);
    var fullPathSansSlash = fullPath.substr(1);
    if (!fullPathSansSlash)
        return [];
    return fullPathSansSlash.split(path_1.sep);
}
exports.filenameToSteps = filenameToSteps;
function pathToSteps(path) {
    return filenameToSteps(pathToFilename(path));
}
exports.pathToSteps = pathToSteps;
function dataToStr(data, encoding) {
    if (encoding === void 0) { encoding = ENCODING_UTF8; }
    if (buffer_1.Buffer.isBuffer(data))
        return data.toString(encoding);
    else if (data instanceof Uint8Array)
        return buffer_1.Buffer.from(data).toString(encoding);
    else
        return String(data);
}
exports.dataToStr = dataToStr;
function dataToBuffer(data, encoding) {
    if (encoding === void 0) { encoding = ENCODING_UTF8; }
    if (buffer_1.Buffer.isBuffer(data))
        return data;
    else if (data instanceof Uint8Array)
        return buffer_1.Buffer.from(data);
    else
        return buffer_1.Buffer.from(String(data), encoding);
}
exports.dataToBuffer = dataToBuffer;
function strToEncoding(str, encoding) {
    if (!encoding || (encoding === ENCODING_UTF8))
        return str;
    if (encoding === 'buffer')
        return new buffer_1.Buffer(str);
    return (new buffer_1.Buffer(str)).toString(encoding);
}
exports.strToEncoding = strToEncoding;
function bufferToEncoding(buffer, encoding) {
    if (!encoding || (encoding === 'buffer'))
        return buffer;
    else
        return buffer.toString(encoding);
}
exports.bufferToEncoding = bufferToEncoding;
function nullCheck(path, callback) {
    if (('' + path).indexOf('\u0000') !== -1) {
        var er = new Error('Path must be a string without null bytes');
        er.code = 'ENOENT';
        if (typeof callback !== 'function')
            throw er;
        process_1.default.nextTick(callback, er);
        return false;
    }
    return true;
}
function _modeToNumber(mode, def) {
    if (typeof mode === 'number')
        return mode;
    if (typeof mode === 'string')
        return parseInt(mode, 8);
    if (def)
        return modeToNumber(def);
    return undefined;
}
function modeToNumber(mode, def) {
    var result = _modeToNumber(mode, def);
    if ((typeof result !== 'number') || isNaN(result))
        throw new TypeError(ERRSTR.MODE_INT);
    return result;
}
function isFd(path) {
    return (path >>> 0) === path;
}
var Volume = (function () {
    function Volume() {
        this.inodes = {};
        this.releasedInos = [];
        this.fds = {};
        this.releasedFds = [];
        this.maxFiles = 10000;
        this.openFiles = 0;
        var root = new node_1.Link(this, null, '');
        root.setNode(this.createNode(true));
        this.root = root;
    }
    Volume.prototype.createLink = function (parent, name, isDirectory, perm) {
        if (isDirectory === void 0) { isDirectory = false; }
        return parent.createChild(name, this.createNode(isDirectory, perm));
    };
    Volume.prototype.deleteLink = function (link) {
        var parent = link.parent;
        if (parent) {
            parent.deleteChild(link);
        }
        link.vol = null;
        link.parent = null;
    };
    Volume.prototype.newInoNumber = function () {
        if (this.releasedInos.length)
            return this.releasedInos.pop();
        else {
            Volume.ino = (Volume.ino++) % 0xFFFFFFFF;
            return Volume.ino;
        }
    };
    Volume.prototype.createNode = function (isDirectory, perm) {
        if (isDirectory === void 0) { isDirectory = false; }
        var node = new node_1.Node(this.newInoNumber(), perm);
        if (isDirectory)
            node.setIsDirectory();
        this.inodes[node.ino] = node;
        return node;
    };
    Volume.prototype.getNode = function (ino) {
        return this.inodes[ino];
    };
    Volume.prototype.deleteNode = function (node) {
        delete this.inodes[node.ino];
        this.releasedInos.push(node.ino);
    };
    Volume.prototype.getLink = function (steps) {
        return this.root.walk(steps);
    };
    Volume.prototype.getDirLink = function (steps) {
        return this.root.walk(steps, steps.length - 1);
    };
    Volume.prototype.resolveSymlinks = function (link) {
        var node = link.getNode();
        while (link && node.isSymlink()) {
            link = this.getLink(node.symlink);
            if (!link)
                return null;
            node = link.getNode();
        }
        return link;
    };
    Volume.prototype.getFileByFd = function (fd) {
        return this.fds[fd];
    };
    Volume.prototype.getNodeByIdOrCreate = function (id, flags, perm) {
        if (typeof id === 'number') {
            var file = this.getFileByFd(id);
            if (!file)
                throw Error('File nto found');
            return file.node;
        }
        else {
            var steps = pathToSteps(id);
            var link = this.getLink(steps);
            if (link)
                return link.getNode();
            if (flags & O_CREAT) {
                var dirLink = this.getDirLink(steps);
                if (dirLink) {
                    var name_1 = steps[steps.length - 1];
                    link = this.createLink(dirLink, name_1, false, perm);
                    return link.getNode();
                }
            }
            throwError('ENOENT', 'getNodeByIdOrCreate', pathToFilename(id));
        }
    };
    Volume.prototype.wrapAsync = function (method, args, callback) {
        var _this = this;
        if (typeof callback !== 'function')
            throw Error(ERRSTR.CB);
        setImmediate_1.default(function () {
            try {
                callback(null, method.apply(_this, args));
            }
            catch (err) {
                callback(err);
            }
        });
    };
    Volume.prototype.openLink = function (link, flagsNum) {
        if (this.openFiles >= this.maxFiles) {
            throw createError('EMFILE');
        }
        var realLink = this.resolveSymlinks(link);
        if (!realLink)
            throwError('ENOENT', 'open', link.getPath());
        var fd;
        if (this.releasedFds.length)
            fd = this.releasedFds.pop();
        var file = new node_1.File(link, realLink.getNode(), flagsNum, fd);
        this.fds[file.fd] = file;
        this.openFiles++;
        if (flagsNum & O_TRUNC)
            file.truncate();
        return file;
    };
    Volume.prototype.openFile = function (fileName, flagsNum, modeNum) {
        var steps = filenameToSteps(fileName);
        var link = this.getLink(steps);
        if (!link) {
            var dirLink = this.getDirLink(steps);
            if ((flagsNum & O_CREAT) && (typeof modeNum === 'number')) {
                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
            }
        }
        if (link)
            return this.openLink(link, flagsNum);
    };
    Volume.prototype.openBase = function (filename, flagsNum, modeNum) {
        var file = this.openFile(filename, flagsNum, modeNum);
        if (!file)
            throw createError('ENOENT', 'open', filename);
        return file.fd;
    };
    Volume.prototype.openSync = function (path, flags, mode) {
        if (mode === void 0) { mode = 438; }
        var modeNum = modeToNumber(mode);
        var fileName = pathToFilename(path);
        var flagsNum = flagsToNumber(flags);
        return this.openBase(fileName, flagsNum, modeNum);
    };
    Volume.prototype.open = function (path, flags, a, b) {
        var mode = a;
        var callback = b;
        if (typeof a === 'function') {
            mode = 438;
            callback = a;
        }
        var modeNum = modeToNumber(mode);
        var fileName = pathToFilename(path);
        var flagsNum = flagsToNumber(flags);
        this.wrapAsync(this.openBase, [fileName, flagsNum, modeNum], callback);
    };
    Volume.prototype.closeFile = function (file) {
        if (!this.fds[file.fd])
            return;
        this.openFiles--;
        delete this.fds[file.fd];
        this.releasedFds.push(file.fd);
    };
    Volume.prototype.closeSync = function (fd) {
        var file = this.getFileByFd(fd);
        if (!file)
            throwError('EBADF', 'close');
        this.closeFile(file);
    };
    Volume.prototype.close = function (fd, callback) {
        this.wrapAsync(this.closeSync, [fd], callback);
    };
    Volume.prototype.openFileOrGetById = function (id, flagsNum, modeNum) {
        if (typeof id === 'number') {
            var file = this.fds[id];
            if (!file)
                throw createError('ENOENT');
            return file;
        }
        else {
            return this.openFile(pathToFilename(id), flagsNum, modeNum);
        }
    };
    Volume.prototype.readFileBase = function (id, flagsNum, encoding) {
        var result;
        if (typeof id === 'number') {
            var file = this.getFileByFd(id);
            if (!file)
                throw createError('ENOENT', 'readFile', String(id));
            result = bufferToEncoding(file.getBuffer(), encoding);
        }
        else {
            var fileName = pathToFilename(id);
            var file = this.openFile(fileName, flagsNum, 0);
            if (!file)
                throw createError('ENOENT', 'readFile', String(id));
            result = bufferToEncoding(file.getBuffer(), encoding);
            this.closeFile(file);
        }
        return result;
    };
    Volume.prototype.readFileSync = function (file, options) {
        var opts = getReadFileOptions(options);
        var flagsNum = flagsToNumber(opts.flag);
        return this.readFileBase(file, flagsNum, opts.encoding);
    };
    Volume.prototype.readFile = function (id, a, b) {
        var options = a;
        var callback = b;
        if (typeof options === 'function') {
            callback = options;
            options = readFileOptsDefaults;
        }
        var opts = getReadFileOptions(options);
        var flagsNum = flagsToNumber(opts.flag);
        this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
    };
    Volume.prototype.writeSync = function (fd, a, b, c, d) {
        if (!isFd(fd))
            throw TypeError(ERRSTR.FD);
        var encoding;
        var offset;
        var length;
        var position;
        if (typeof a !== 'string') {
            offset = b | 0;
            length = c;
            position = d;
        }
        else {
            position = b;
            encoding = c;
        }
        var buf = dataToBuffer(a, encoding);
        if (typeof a !== 'string') {
            if (typeof length === 'undefined') {
                length = buf.length;
            }
        }
        else {
            offset = 0;
            length = buf.length;
        }
        var file = this.getFileByFd(fd);
        if (!file)
            throwError('ENOENT', 'write');
        return file.write(buf, offset, length, position);
    };
    Volume.prototype.writeFileBase = function (id, buf, flagsNum, modeNum) {
        var isUserFd = typeof id === 'number';
        var fd;
        if (isUserFd)
            fd = id;
        else {
            fd = this.openBase(pathToFilename(id), flagsNum, modeNum);
        }
        var offset = 0;
        var length = buf.length;
        var position = (flagsNum & O_APPEND) ? null : 0;
        try {
            while (length > 0) {
                var written = this.writeSync(fd, buf, offset, length, position);
                offset += written;
                length -= written;
                if (position !== null)
                    position += written;
            }
        }
        finally {
            if (!isUserFd)
                this.closeSync(fd);
        }
    };
    Volume.prototype.writeFileSync = function (id, data, options) {
        var opts = getWriteFileOptions(options);
        var flagsNum = flagsToNumber(opts.flag);
        var modeNum = modeToNumber(opts.mode);
        var buf = dataToBuffer(data, opts.encoding);
        this.writeFileBase(id, buf, flagsNum, modeNum);
    };
    Volume.prototype.writeFile = function (id, data, a, b) {
        var options = a;
        var callback = b;
        if (typeof a === 'function') {
            options = writeFileDefaults;
            callback = a;
        }
        var opts = getWriteFileOptions(options);
        var flagsNum = flagsToNumber(opts.flag);
        var modeNum = modeToNumber(opts.mode);
        var buf = dataToBuffer(data, opts.encoding);
        this.wrapAsync(this.writeFileBase, [id, buf, flagsNum, modeNum], callback);
    };
    Volume.prototype.linkBase = function (filename1, filename2) {
        var steps1 = filenameToSteps(filename1);
        var link1 = this.getLink(steps1);
        if (!link1)
            throwError('ENOENT', 'link', filename1, filename2);
        var steps2 = filenameToSteps(filename2);
        var dir2 = this.getDirLink(steps2);
        if (!dir2)
            throwError('ENOENT', 'link', filename1, filename2);
        var name = steps2[steps2.length - 1];
        if (dir2.getChild(name))
            throwError('EEXIST', 'link', filename1, filename2);
        var node = link1.getNode();
        node.nlink++;
        dir2.createChild(name, node);
    };
    Volume.prototype.linkSync = function (existingPath, newPath) {
        var existingPathFilename = pathToFilename(existingPath);
        var newPathFilename = pathToFilename(newPath);
        this.linkBase(existingPathFilename, newPathFilename);
    };
    Volume.prototype.link = function (existingPath, newPath, callback) {
        var existingPathFilename = pathToFilename(existingPath);
        var newPathFilename = pathToFilename(newPath);
        this.wrapAsync(this.linkBase, [existingPathFilename, newPathFilename], callback);
    };
    Volume.prototype.unlinkBase = function (filename) {
        var steps = filenameToSteps(filename);
        var link = this.getLink(steps);
        if (!link)
            throwError('ENOENT', 'unlink', filename);
        if (link.length)
            throw Error('Dir not empty...');
        this.deleteLink(link);
        var node = link.getNode();
        node.nlink--;
        if (node.nlink <= 0) {
            this.deleteNode(node);
        }
    };
    Volume.prototype.unlinkSync = function (path) {
        var filename = pathToFilename(path);
        this.unlinkBase(filename);
    };
    Volume.prototype.unlink = function (path, callback) {
        var filename = pathToFilename(path);
        this.wrapAsync(this.unlinkBase, [filename], callback);
    };
    Volume.prototype.symlinkBase = function (targetFilename, pathFilename) {
        var pathSteps = filenameToSteps(pathFilename);
        var dirLink = this.getDirLink(pathSteps);
        if (!dirLink)
            throwError('ENOENT', 'symlink', targetFilename, pathFilename);
        var name = pathSteps[pathSteps.length - 1];
        if (dirLink.getChild(name))
            throwError('EEXIST', 'symlink', targetFilename, pathFilename);
        var symlink = dirLink.createChild(name);
        symlink.getNode().makeSymlink(filenameToSteps(targetFilename));
        return symlink;
    };
    Volume.prototype.symlinkSync = function (target, path, type) {
        var targetFilename = pathToFilename(target);
        var pathFilename = pathToFilename(path);
        this.symlinkBase(targetFilename, pathFilename);
    };
    Volume.prototype.symlink = function (target, path, a, b) {
        var type = a;
        var callback = b;
        if (typeof type === 'function') {
            type = 'file';
            callback = a;
        }
        var targetFilename = pathToFilename(target);
        var pathFilename = pathToFilename(path);
        this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
    };
    Volume.prototype.realpathBase = function (filename, encoding) {
        var steps = filenameToSteps(filename);
        var link = this.getLink(steps);
        if (!link)
            throwError('ENOENT', 'realpath', filename);
        var realLink = this.resolveSymlinks(link);
        if (!realLink)
            throwError('ENOENT', 'realpath', filename);
        return strToEncoding(realLink.getPath(), encoding);
    };
    Volume.prototype.realpathSync = function (path, options) {
        return this.realpathBase(pathToFilename(path), getRealpathOptions(options).encoding);
    };
    Volume.prototype.realpath = function (path, a, b) {
        var _a = getRealpathOptsAndCb(a, b), opts = _a[0], callback = _a[1];
        var pathFilename = pathToFilename(path);
        this.wrapAsync(this.realpathBase, [pathFilename, opts.encoding], callback);
    };
    Volume.prototype.lstatBase = function (filename) {
        var link = this.getLink(filenameToSteps(filename));
        if (!link)
            throwError('ENOENT', 'lstat', filename);
        return node_1.Stats.build(link.getNode());
    };
    Volume.prototype.lstatSync = function (path) {
        return this.lstatBase(pathToFilename(path));
    };
    Volume.prototype.lstat = function (path, callback) {
        this.wrapAsync(this.lstatBase, [pathToFilename(path)], callback);
    };
    Volume.prototype.statBase = function (filename) {
        var link = this.getLink(filenameToSteps(filename));
        if (!link)
            throwError('ENOENT', 'stat', filename);
        link = this.resolveSymlinks(link);
        if (!link)
            throwError('ENOENT', 'stat', filename);
        return node_1.Stats.build(link.getNode());
    };
    Volume.prototype.statSync = function (path) {
        return this.statBase(pathToFilename(path));
    };
    Volume.prototype.stat = function (path, callback) {
        this.wrapAsync(this.statBase, [pathToFilename(path)], callback);
    };
    Volume.prototype.fstatBase = function (fd) {
        var file = this.getFileByFd(fd);
        if (!file)
            throwError('EBADF', 'fstat');
        return node_1.Stats.build(file.node);
    };
    Volume.prototype.fstatSync = function (fd) {
        return this.fstatBase(fd);
    };
    Volume.prototype.fstat = function (fd, callback) {
        this.wrapAsync(this.fstatBase, [fd], callback);
    };
    Volume.prototype.renameBase = function (oldPathFilename, newPathFilename) {
        var link = this.getLink(filenameToSteps(oldPathFilename));
        if (!link)
            throwError('ENOENT', 'rename', oldPathFilename, newPathFilename);
        var newPathSteps = filenameToSteps(newPathFilename);
        var newPathDirLink = this.getDirLink(newPathSteps);
        if (!newPathDirLink)
            throwError('ENOENT', 'rename', oldPathFilename, newPathFilename);
        var oldLinkParent = link.parent;
        if (oldLinkParent) {
            oldLinkParent.deleteChild(link);
        }
        link.steps = newPathSteps;
        newPathDirLink.setChild(link.getName(), link);
    };
    Volume.prototype.renameSync = function (oldPath, newPath) {
        var oldPathFilename = pathToFilename(oldPath);
        var newPathFilename = pathToFilename(newPath);
        this.renameBase(oldPathFilename, newPathFilename);
    };
    Volume.prototype.rename = function (oldPath, newPath, callback) {
        var oldPathFilename = pathToFilename(oldPath);
        var newPathFilename = pathToFilename(newPath);
        this.wrapAsync(this.renameBase, [oldPathFilename, newPathFilename], callback);
    };
    Volume.prototype.existsBase = function (filename) {
        return !!this.statBase(filename);
    };
    Volume.prototype.existsSync = function (path) {
        return this.existsBase(pathToFilename(path));
    };
    Volume.prototype.exists = function (path, callback) {
        var _this = this;
        var filename = pathToFilename(path);
        if (typeof callback !== 'function')
            throw Error(ERRSTR.CB);
        setImmediate_1.default(function () {
            try {
                callback(_this.existsBase(filename));
            }
            catch (err) {
                callback(false);
            }
        });
    };
    Volume.prototype.accessBase = function (filename, mode) {
        var steps = filenameToSteps(filename);
        var link = this.getLink(steps);
        if (!link)
            throwError('ENOENT', 'access', filename);
    };
    Volume.prototype.accessSync = function (path, mode) {
        if (mode === void 0) { mode = F_OK; }
        var filename = pathToFilename(path);
        mode = mode | 0;
        this.accessBase(filename, mode);
    };
    Volume.prototype.access = function (path, a, b) {
        var mode = a;
        var callback = b;
        if (typeof mode === 'function') {
            mode = F_OK;
            callback = a;
        }
        var filename = pathToFilename(path);
        mode = mode | 0;
        this.wrapAsync(this.accessBase, [filename, mode], callback);
    };
    Volume.prototype.appendFileSync = function (id, data, options) {
        if (options === void 0) { options = appendFileDefaults; }
        var opts = getAppendFileOptions(options);
        if (!opts.flag || isFd(id))
            opts.flag = 'a';
        this.writeFileSync(id, data, opts);
    };
    Volume.prototype.readdirBase = function (filename, encoding) {
        var steps = filenameToSteps(filename);
        var link = this.getLink(steps);
        if (!link)
            throwError('ENOENT', 'readdir', filename);
        var node = link.getNode();
        if (!node.isDirectory())
            throwError('ENOTDIR', 'scandir', filename);
        var list = [];
        for (var name_2 in link.children)
            list.push(strToEncoding(name_2, encoding));
        if (encoding !== 'buffer')
            list.sort();
        return list;
    };
    Volume.prototype.readdirSync = function (path, options) {
        var opts = getDefaultOptions(options);
        var filename = pathToFilename(path);
        return this.readdirBase(filename, opts.encoding);
    };
    Volume.prototype.readdir = function (path, a, b) {
        var options = a;
        var callback = b;
        if (typeof a === 'function') {
            callback = a;
            options = optsDefaults;
        }
        var opts = getDefaultOptions(options);
        var filename = pathToFilename(path);
        this.wrapAsync(this.readdirBase, [filename, opts.encoding], callback);
    };
    Volume.ino = 0;
    return Volume;
}());
exports.Volume = Volume;
