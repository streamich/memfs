"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var node_1 = require("./node");
var setImmediate_1 = require("./setImmediate");
var buffer_1 = require("buffer");
var Layer = (function () {
    function Layer(mountpoint, files) {
        this.files = {};
        this.mountpoint = path_1.resolve(mountpoint);
        this.files = files;
    }
    Layer.prototype.toJSON = function () {
        return this.files;
    };
    return Layer;
}());
exports.Layer = Layer;
var Volume = (function () {
    function Volume() {
        this.flattened = {};
        this.layers = [];
        this.fds = {};
    }
    Volume.prototype.normalize = function (somepath) {
        somepath = path_1.normalize(somepath);
        if (somepath[somepath.length - 1] == path_1.sep)
            somepath = somepath.substr(0, somepath.length - 1);
        return somepath;
    };
    Volume.prototype.addDir = function (fullpath, layer) {
        fullpath = this.normalize(fullpath);
        if (this.flattened[fullpath])
            throw Error('Node already exists: ' + fullpath);
        var relative = relative(layer.mountpoint, fullpath);
        relative = relative.replace(/\\/g, '/');
        var directory = new node_1.Directory(relative, layer);
        this.flattened[fullpath] = directory;
        this.fds[directory.fd] = directory;
        return directory;
    };
    Volume.prototype.addFile = function (fullpath, layer) {
        fullpath = this.normalize(fullpath);
        if (this.flattened[fullpath])
            throw Error('Node already exists: ' + fullpath);
        var relative = relative(layer.mountpoint, fullpath);
        relative = relative.replace(/\\/g, '/');
        var node = new node_1.File(relative, layer);
        this.flattened[fullpath] = node;
        this.fds[node.fd] = node;
        var steps = relative.split('/');
        var dirfullpath = layer.mountpoint;
        for (var i = 0; i < steps.length - 1; i++) {
            dirfullpath += path_1.sep + steps[i];
            var exists = !!this.flattened[fullpath];
            if (!exists)
                this.addDir(dirfullpath, layer);
        }
        return node;
    };
    Volume.prototype.addLayer = function (layer) {
        this.layers.push(layer);
        var mountpoint = path_1.resolve(layer.mountpoint) + path_1.sep;
        this.addDir(mountpoint, layer);
        for (var relative in layer.files) {
            var filepath = relative.replace(/\//g, path_1.sep);
            var fullpath = mountpoint + filepath;
            this.addFile(fullpath, layer);
        }
    };
    Volume.prototype.getFilePath = function (p) {
        var filepath = path_1.resolve(p);
        var node = this.getNode(filepath);
        return node ? node : null;
    };
    Volume.prototype.getNode = function (p) {
        var filepath = path_1.resolve(p);
        var node = this.flattened[filepath];
        if (!node)
            throw this.err404(filepath);
        return node;
    };
    Volume.prototype.getFile = function (p) {
        var node = this.getNode(p);
        if (node instanceof node_1.File)
            return node;
        throw this.err404(node.path);
    };
    Volume.prototype.getDirectory = function (p) {
        var node = this.getNode(p);
        if (node instanceof node_1.Directory)
            return node;
        throw Error('Directory not found: ' + node.path);
    };
    Volume.prototype.getByFd = function (fd) {
        var node = this.fds[fd];
        if (node)
            return node;
        throw Error('Node file descriptor not found: ' + fd);
    };
    Volume.prototype.getLayerContainingPath = function (fullpath) {
        for (var i = 0; i < this.layers.length; i++) {
            var layer = this.layers[i];
            if (fullpath.indexOf(layer.mountpoint) === 0)
                return layer;
        }
        return null;
    };
    Volume.prototype.err404 = function (file) {
        return Error('File not found: ' + file);
    };
    Volume.prototype.mountSync = function (mountpoint, files) {
        if (mountpoint === void 0) { mountpoint = '/'; }
        if (files === void 0) { files = {}; }
        this.addLayer(new Layer(mountpoint, files));
    };
    Volume.prototype.mount = function (mountpoint, files, callback) {
    };
    Volume.prototype.readFileSync = function (file, encoding) {
        var f = this.getFile(file);
        if (encoding) {
            return f.getData();
        }
        else {
            var Buffer = require('buffer').Buffer;
            return new Buffer(f.getData());
        }
    };
    Volume.prototype.readFile = function (file, options, cb) {
        var _this = this;
        if (typeof options == "function") {
            cb = options;
            options = {};
        }
        try {
            this.getFile(file);
            setImmediate_1.default(function () { return cb(null, _this.readFileSync(file, options)); });
        }
        catch (e) {
            cb(e);
        }
    };
    Volume.prototype.realpathSync = function (file, opts) {
        var node = this.getNode(file);
        return node.path;
    };
    Volume.prototype.realpath = function (filepath, cache, callback) {
        var _this = this;
        if (typeof cache == "function")
            callback = cache;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.realpathSync(filepath, cache));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.statSync = function (p) {
        var node = this.getNode(p);
        return node.stats();
    };
    Volume.prototype.lstatSync = function (p) {
        return this.statSync(p);
    };
    Volume.prototype.stat = function (p, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.statSync(p));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.lstat = function (p, callback) {
        this.stat(p, callback);
    };
    Volume.prototype.renameSync = function (oldPath, newPath) {
        var node = this.getNode(oldPath);
        oldPath = node.path;
        newPath = path_1.resolve(newPath);
        delete this.flattened[oldPath];
        this.flattened[newPath] = node;
        node.path = newPath;
        node.relative = path_1.relative(node.layer.mountpoint, newPath);
    };
    Volume.prototype.rename = function (oldPath, newPath, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.renameSync(oldPath, newPath);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.fstatSync = function (fd) {
        return this.getByFd(fd).stats();
    };
    Volume.prototype.fstat = function (fd, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.fstatSync(fd));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.writeFileSync = function (filename, data, options) {
        var file;
        try {
            file = this.getFile(filename);
        }
        catch (e) {
            var fullPath = path_1.resolve(filename);
            var layer = this.getLayerContainingPath(fullPath);
            if (!layer)
                throw Error('Cannot create new file at this path: ' + fullPath);
            file = this.addFile(fullPath, layer);
        }
        file.setData(data.toString());
    };
    Volume.prototype.writeFile = function (filename, data, options, callback) {
        var _this = this;
        if (typeof options == "function") {
            callback = options;
            options = null;
        }
        setImmediate_1.default(function () {
            try {
                _this.writeFileSync(filename, data, options);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.existsSync = function (filename) {
        var fullpath = path_1.resolve(filename);
        if (!this.getLayerContainingPath(fullpath))
            throw ('Path not in mount point.');
        try {
            this.getNode(filename);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    Volume.prototype.exists = function (filename, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            callback(_this.existsSync(filename));
        });
    };
    Volume.prototype.readdirSync = function (p) {
        var fullpath = path_1.resolve(p);
        var layer = this.getLayerContainingPath(fullpath);
        if (!layer) {
            throw Error('Directory not found: ' + fullpath);
        }
        try {
            var dir = this.getDirectory(fullpath);
        }
        catch (e) {
            throw Error("ENOENT: no such file or directory, scandir '" + fullpath + "'");
        }
        var len = fullpath.length;
        var index = {};
        for (var nodepath in this.flattened) {
            if (nodepath.indexOf(fullpath) === 0) {
                try {
                    var node = this.getNode(nodepath);
                }
                catch (e) {
                    throw e;
                }
                var relative_1 = nodepath.substr(len + 1);
                var sep_pos = relative_1.indexOf(path_1.sep);
                if (sep_pos > -1)
                    relative_1 = relative_1.substr(0, sep_pos);
                if (relative_1)
                    index[relative_1] = 1;
            }
        }
        var files = [];
        for (var file in index)
            files.push(file);
        return files;
    };
    Volume.prototype.readdir = function (p, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.readdirSync(p));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.appendFileSync = function (filename, data, options) {
        try {
            var file = this.getFile(filename);
            file.setData(file.getData() + data.toString());
        }
        catch (e) {
            var fullpath = path_1.resolve(filename);
            var layer = this.getLayerContainingPath(fullpath);
            if (!layer)
                throw Error('Cannot create new file at this path: ' + fullpath);
            var file = this.addFile(fullpath, layer);
            file.setData(data.toString());
        }
    };
    Volume.prototype.appendFile = function (filename, data, options, callback) {
        var _this = this;
        if (typeof options == 'function') {
            callback = options;
            options = null;
        }
        setImmediate_1.default(function () {
            try {
                _this.appendFileSync(filename, data, options);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.unlinkSync = function (filename) {
        var node = this.getNode(filename);
        delete node.layer.files[node.relative];
        delete this.flattened[node.path];
        delete this.fds[node.fd];
    };
    Volume.prototype.unlink = function (filename, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.unlinkSync(filename);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.truncateSync = function (filename, len) {
        var file = this.getFile(filename);
        file.truncate(len);
    };
    Volume.prototype.truncate = function (filename, len, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.truncateSync(filename, len);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.ftruncateSync = function (fd, len) {
        var node = this.getByFd(fd);
        if (!(node instanceof node_1.File))
            this.err404(node.path);
        node.truncate(len);
    };
    Volume.prototype.ftruncate = function (fd, len, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.ftruncateSync(fd, len);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.chownSync = function (filename, uid, gid) {
        var node = this.getNode(filename);
        node.chown(uid, gid);
    };
    Volume.prototype.chown = function (filename, uid, gid, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.chownSync(filename, uid, gid);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.fchownSync = function (fd, uid, gid) {
        var node = this.getByFd(fd);
        node.chown(uid, gid);
    };
    Volume.prototype.fchown = function (fd, uid, gid, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.fchownSync(fd, uid, gid);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.lchownSync = function (filename, uid, gid) {
        this.chownSync(filename, uid, gid);
    };
    Volume.prototype.lchown = function (filename, uid, gid, callback) {
        this.chown(filename, uid, gid, callback);
    };
    Volume.prototype.chmodSync = function (filename, mode) {
        this.getNode(filename);
    };
    Volume.prototype.chmod = function (filename, mode, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.chmodSync(filename, mode);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.fchmodSync = function (fd, mode) {
        this.getByFd(fd);
    };
    Volume.prototype.fchmod = function (fd, mode, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.fchmodSync(fd, mode);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.lchmodSync = function (filename, mode) {
        this.chmodSync(filename, mode);
    };
    Volume.prototype.lchmod = function (filename, mode, callback) {
        this.chmod(filename, mode, callback);
    };
    Volume.prototype.rmdirSync = function (p) {
        var dir = this.getDirectory(p);
        delete this.flattened[dir.path];
        delete this.fds[dir.fd];
    };
    Volume.prototype.rmdir = function (p, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.rmdirSync(p);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.openSync = function (p, flags, mode) {
        var file = this.getFile(p);
        return file.fd;
    };
    Volume.prototype.open = function (p, flags, mode, callback) {
        var _this = this;
        if (typeof mode == 'function') {
            callback = mode;
            mode = 438;
        }
        setImmediate_1.default(function () {
            try {
                callback(null, _this.openSync(p, flags, mode));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.utimesSync = function (filename, atime, mtime) {
        var node = this.getNode(filename);
        node.atime = atime;
        node.mtime = mtime;
    };
    Volume.prototype.utimes = function (filename, atime, mtime, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.utimesSync(filename, atime, mtime));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.futimesSync = function (fd, atime, mtime) {
        var node = this.getByFd(fd);
        node.atime = atime;
        node.mtime = mtime;
    };
    Volume.prototype.futimes = function (fd, atime, mtime, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.futimesSync(fd, atime, mtime));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.accessSync = function (filename, mode) {
        this.getNode(filename);
    };
    Volume.prototype.access = function (filename, mode, callback) {
        var _this = this;
        if (typeof mode == 'function') {
            callback = mode;
            mode = 7;
        }
        setImmediate_1.default(function () {
            try {
                _this.accessSync(filename, mode);
                callback();
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.closeSync = function (fd) {
        this.getNode(fd);
    };
    Volume.prototype.close = function (fd, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.closeSync(fd);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.mkdirSync = function (p, mode) {
        var fullpath = path_1.resolve(p);
        var layer = this.getLayerContainingPath(fullpath);
        if (!layer)
            throw Error('Cannot create directory at this path: ' + fullpath);
        try {
            var parent = path_1.dirname(fullpath);
            var dir = this.getDirectory(parent);
        }
        catch (e) {
            throw Error("ENOENT: no such file or directory, mkdir '" + fullpath + "'");
        }
        this.addDir(fullpath, layer);
    };
    Volume.prototype.mkdir = function (p, mode, callback) {
        var _this = this;
        if (typeof mode == 'function') {
            callback = mode;
            mode = 511;
        }
        setImmediate_1.default(function () {
            try {
                _this.mkdirSync(p, mode);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.writeSync = function (fd, data, position, encoding) {
        var file = this.getByFd(fd);
        if (!(file instanceof node_1.File))
            throw Error('Is not a file: ' + file.path);
        if (!(data instanceof buffer_1.Buffer)) {
            data = data.toString();
        }
        else {
            var buffer = data;
            var offset = position;
            var length = encoding;
            position = arguments[4];
            data = buffer.slice(offset, length);
            data = data.toString();
        }
        if (typeof position == 'undefined')
            position = file.position;
        var cont = file.getData();
        cont = cont.substr(0, position) + data + cont.substr(position + data.length);
        file.setData(cont);
        file.position = position + data.length;
        return buffer_1.Buffer.byteLength(data, encoding);
    };
    Volume.prototype.write = function (fd, buffer, offset, length, position, callback) {
        var _this = this;
        if (typeof position == 'function') {
            callback = position;
            position = void 0;
        }
        if (typeof length == 'function') {
            callback = length;
            length = position = void 0;
        }
        if (typeof offset == 'function') {
            callback = offset;
            offset = length = position = void 0;
        }
        setImmediate_1.default(function () {
            try {
                var bytes = _this.writeSync(fd, buffer, offset, length, position);
                if (callback)
                    callback(null, bytes);
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.readSync = function (fd, buffer, offset, length, position) {
        var file = this.getByFd(fd);
        if (!(file instanceof node_1.File))
            throw Error('Not a file: ' + file.path);
        var data = file.getData();
        if (position === null)
            position = file.position;
        var chunk = data.substr(position, length);
        buffer.write(chunk, offset, length);
        return chunk.length;
    };
    Volume.prototype.read = function (fd, buffer, offset, length, position, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                var bytes = _this.readSync(fd, buffer, offset, length, position);
                callback(null, bytes, buffer);
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.linkSync = function (srcpath, dstpath) {
        var node = this.getNode(srcpath);
        dstpath = path_1.resolve(dstpath);
        if (this.flattened[dstpath])
            throw Error('Destination path already in use: ' + dstpath);
        this.flattened[dstpath] = node;
    };
    Volume.prototype.link = function (srcpath, dstpath, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.linkSync(srcpath, dstpath);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.symlinkSync = function (srcpath, dstpath, t) {
        this.linkSync(srcpath, dstpath);
    };
    Volume.prototype.symlink = function (srcpath, dstpath, t, callback) {
        if (typeof t == 'function') {
            callback = t;
            t = void 0;
        }
        this.link(srcpath, dstpath, callback);
    };
    Volume.prototype.readlinkSync = function (p) {
        var node = this.getNode(p);
        return node.path;
    };
    Volume.prototype.readlink = function (p, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                callback(null, _this.readlinkSync(p));
            }
            catch (e) {
                callback(e);
            }
        });
    };
    Volume.prototype.fsyncSync = function (fd) {
        this.getByFd(fd);
    };
    Volume.prototype.fsync = function (fd, callback) {
        var _this = this;
        setImmediate_1.default(function () {
            try {
                _this.fsyncSync(fd);
                if (callback)
                    callback();
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        });
    };
    Volume.prototype.createReadStream = function (p, options) {
        options = options || {};
        var file = options.fd ? this.getByFd(options.fd) : this.getFile(p);
        if (!(file instanceof node_1.File))
            throw Error('Not a file: ' + file.path);
        var util = require('util');
        var Readable = require('stream').Readable;
        var Buffer = require('buffer').Buffer;
        function MemFileReadStream(opt) {
            Readable.call(this, opt);
            this.done = false;
        }
        util.inherits(MemFileReadStream, Readable);
        MemFileReadStream.prototype._read = function () {
            if (!this.done) {
                this.push(new Buffer(file.getData()));
                this.done = true;
            }
            else {
                this.push(null);
            }
        };
        return new MemFileReadStream();
    };
    Volume.prototype.createWriteStream = function (p, options) {
        options = options || {};
        var file = (options.fd ? this.getByFd(options.fd) : this.getFile(p));
        if (!(file instanceof node_1.File))
            throw Error('Not a file: ' + file.path);
        if (options.start)
            file.position = options.start;
        var util = require('util');
        var Writable = require('stream').Writable;
        var Buffer = require('buffer').Buffer;
        function MemFileWriteStream(opt) {
            Writable.call(this, opt);
        }
        util.inherits(MemFileWriteStream, Writable);
        MemFileWriteStream.prototype._write = function (chunk) {
            chunk = chunk.toString();
            var cont = file.getData();
            cont = cont.substr(0, file.position) + chunk + cont.substr(file.position + chunk.length);
            file.setData(cont);
            file.position += chunk.length;
        };
        return new MemFileWriteStream();
    };
    return Volume;
}());
exports.Volume = Volume;
