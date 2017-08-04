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
var O_RDONLY = constants_1.constants.O_RDONLY, O_WRONLY = constants_1.constants.O_WRONLY, O_RDWR = constants_1.constants.O_RDWR, O_CREAT = constants_1.constants.O_CREAT, O_EXCL = constants_1.constants.O_EXCL, O_NOCTTY = constants_1.constants.O_NOCTTY, O_TRUNC = constants_1.constants.O_TRUNC, O_APPEND = constants_1.constants.O_APPEND, O_DIRECTORY = constants_1.constants.O_DIRECTORY, O_NOATIME = constants_1.constants.O_NOATIME, O_NOFOLLOW = constants_1.constants.O_NOFOLLOW, O_SYNC = constants_1.constants.O_SYNC, O_DIRECT = constants_1.constants.O_DIRECT, O_NONBLOCK = constants_1.constants.O_NONBLOCK;
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
    switch (errorCode) {
        case 'ENOENT': return "ENOENT: no such file or directory, " + func + " '" + path + "'";
        case 'EBADF': return "EBADF: bad file descriptor, " + func;
        case 'EINVAL': return "EINVAL: invalid argument, " + func;
        case 'EPERM': return "EPERM: operation not permitted, " + func + " '" + path + "' -> '" + path2 + "'";
        case 'EPROTO': return "EPROTO: protocol error, " + func + " '" + path + "' -> '" + path2 + "'";
        case 'EEXIST': return "EEXIST: file already exists, " + func + " '" + path + "' -> '" + path2 + "'";
        case 'EACCES':
        case 'EISDIR':
        case 'EMFILE':
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
var optionAndCallbackGenerator = function (getOpts) {
    return function (options, callback) { return typeof options === 'function'
        ? [getOpts(), options]
        : [getOpts(options), validateCallback(callback)]; };
};
var optsDefaults = {
    encoding: 'utf8',
};
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
    var fulPathSansSlash = fullPath.substr(1);
    return fulPathSansSlash.split(path_1.sep);
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
        (new buffer_1.Buffer(data)).toString(encoding);
    else
        return String(data);
}
exports.dataToStr = dataToStr;
function strToEncoding(str, encoding) {
    if (encoding === ENCODING_UTF8)
        return str;
    if (!encoding)
        return new buffer_1.Buffer(str);
    var buf = new buffer_1.Buffer(str);
    return buf.toString(encoding);
}
exports.strToEncoding = strToEncoding;
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
var Volume = (function () {
    function Volume() {
        this.NodeClass = node_1.Node;
        this.root = new (this.NodeClass)(null, '', true);
        this.fds = {};
    }
    Volume.prototype.getNode = function (steps) {
        return this.root.walk(steps);
    };
    Volume.prototype.getDirNode = function (steps) {
        return this.root.walk(steps, steps.length - 1);
    };
    Volume.prototype.getNodeOrCreateFileNode = function (steps) {
        var dirNode = this.root.walk(steps, steps.length - 1);
        if (!dirNode)
            throw Error('Directory not found');
        var filename = steps[steps.length - 1];
        var node = dirNode.getChild(filename);
        if (node) {
            return node;
        }
        else {
            return dirNode.createChild(filename);
        }
    };
    Volume.prototype.getNodeById = function (id) {
        if (typeof id === 'number') {
            var file = this.getFileByFd(id);
            if (!file)
                throw Error('File nto found');
            return file.node;
        }
        else if ((typeof id === 'string') || (buffer_1.Buffer.isBuffer(id))) {
            return this.getNode(pathToSteps(id));
        }
    };
    Volume.prototype.getFileByFd = function (fd) {
        return this.fds[fd];
    };
    Volume.prototype.getNodeByIdOrCreate = function (id, flags, mode) {
        if (typeof id === 'number') {
            var file = this.getFileByFd(id);
            if (!file)
                throw Error('File nto found');
            return file.node;
        }
        else {
            var steps = pathToSteps(id);
            var node = this.getNode(steps);
            if (node)
                return node;
            if (flags & O_CREAT) {
                var dirNode = this.getDirNode(steps);
                if (dirNode) {
                    node = this.createNode(dirNode, steps[steps.length - 1], false, mode);
                    if (node)
                        return node;
                }
            }
            throw Error('Not found');
        }
    };
    Volume.prototype.openFile = function (node, flags) {
        var file = new node_1.File(node, flags);
        this.fds[file.fd] = file;
        if (flags & O_TRUNC)
            file.truncate();
        return file;
    };
    Volume.prototype.createNode = function (parent, name, isDirectory, mode) {
        var node = parent.createChild(name, isDirectory, mode);
        return node;
    };
    Volume.prototype.readFileSync = function (file, options) {
        var opts = getReadFileOptions(options);
        var node = this.getNodeById(file);
        if (!node)
            throw Error('Not found');
        return strToEncoding(node.getData(), opts.encoding);
    };
    Volume.prototype.wrapAsync = function (method, args, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, method.apply(_this, args));
            }
            catch (err) {
                callback(err);
            }
        });
    };
    Volume.prototype.openBase = function (fileName, flagsNum, modeNum) {
        var steps = filenameToSteps(fileName);
        var node = this.getNode(steps);
        if (!node) {
            var dirNode = this.getDirNode(steps);
            if (flagsNum & O_CREAT) {
                node = this.createNode(dirNode, steps[steps.length - 1], false, modeNum);
            }
        }
        if (node) {
            var file = this.openFile(node, flagsNum);
            return file.fd;
        }
        throw createError('ENOENT', 'open', fileName);
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
    Volume.prototype.writeFileBase = function (id, dataStr, flagsNum, modeNum) {
        var node = this.getNodeByIdOrCreate(id, flagsNum, modeNum);
        node.setData(dataStr);
    };
    Volume.prototype.writeFileSync = function (id, data, options) {
        var opts = getWriteFileOptions(options);
        var flagsNum = flagsToNumber(opts.flag);
        var modeNum = modeToNumber(opts.mode);
        var dataStr = dataToStr(data, opts.encoding);
        this.writeFileBase(id, dataStr, flagsNum, modeNum);
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
        var dataStr = dataToStr(data, opts.encoding);
        this.wrapAsync(this.writeFileBase, [id, dataStr, flagsNum, modeNum], callback);
    };
    return Volume;
}());
exports.Volume = Volume;
