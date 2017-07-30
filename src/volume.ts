import {resolve, normalize, sep, relative, dirname} from 'path';
import {Node, File, Directory, Stats} from "./node";
import setImmediate from './setImmediate';
import {Buffer} from 'buffer';



export type TLayerFiles = {[relativePath: string]: string};


/**
 * A single `JSON` file of data mounted to a single mount point.
 * We have it so that we can store file contents in a single JS string dictionary.
 */
export class Layer {

    // The root directory at which this layer was mounted.
    mountpoint: string;

    /**
     * A map of relative file names to file contents `string`s.
     *
     *     {
     *         "test.txt": "...."
     *         "some/path/hello.txt": "world ..."
     *     }
     */
    files: TLayerFiles = {};

    constructor(mountpoint: string, files: TLayerFiles) {
        this.mountpoint = resolve(mountpoint);
        this.files = files;
    }

    toJSON() {
        return this.files;
    }
}



/**
 * `Volume` represents a file system. It is a collection of one or more layers.
 * We have this, so that we override functions with `.attach()` only once.
 */
export class Volume {

    // A flattened map of all nodes in this file system.
    flattened: {[absolutePath: string]: Node} = {};

    // Collection of file layers, where the top ones override the bottom ones.
    layers: Layer[] = [];

    // A map of pseudo 'file descriptors' to LNodes.
    fds = {};

    normalize(somepath) {
        somepath = normalize(somepath);
        // Remove trailing slash.
        if(somepath[somepath.length - 1] == sep) somepath = somepath.substr(0, somepath.length - 1);
        return somepath;
    }

    addDir(fullpath: string, layer: Layer) {
        fullpath = this.normalize(fullpath);
        if(this.flattened[fullpath]) throw Error('Node already exists: ' + fullpath);

        let relativePath = relative(layer.mountpoint, fullpath);
        relativePath = relativePath.replace(/\\/g, '/'); // Always use forward slashed in our virtual relative paths.

        const directory = new Directory(relativePath, layer);
        this.flattened[fullpath] = directory;
        this.fds[directory.fd] = directory;
        return directory;
    }

    addFile(fullpath: string, layer: Layer) {
        fullpath = this.normalize(fullpath);
        if(this.flattened[fullpath]) throw Error('Node already exists: ' + fullpath);

        let relativePath = relative(layer.mountpoint, fullpath);
        relativePath = relativePath.replace(/\\/g, '/'); // Always use forward slashed in our virtual relative paths.
        var node = new File(relativePath, layer);

        this.flattened[fullpath] = node;
        this.fds[node.fd] = node;

        var steps = relativePath.split('/');
        var dirfullpath = layer.mountpoint;
        for(var i = 0; i < steps.length - 1; i++) {
            dirfullpath += sep + steps[i];
            var exists = !!this.flattened[fullpath];
            if(!exists) this.addDir(dirfullpath, layer);
        }

        return node;
    }

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

    /**
     * Mount virtual in-memory files.
     * @param mountpoint Path to the root of the mounting point.
     * @param files A dictionary of relative file paths to their contents.
     */
    mountSync(mountpoint: string = '/', files: TLayerFiles = {}) {
        this.addLayer(new Layer(mountpoint, files));
    }

    // TODO: Mount from URL?
    // TODO: `mount('/usr/lib', 'http://example.com/volumes/usr/lib.json', callback)`
    // TODO: ...also cache that it has been loaded...
    mount(mountpoint: string, files: {[s: string] : string}|string, callback) {

    }


    // fs.readFile(filename[, options])
    readFileSync(file, encoding?) {
        var f = this.getFile(file);
        if(encoding) {
            return f.getData(); // String
        } else {
            // return f.getData(); // String
            var Buffer = require('buffer').Buffer;
            return new Buffer(f.getData()); // Buffer
        }
    }

    // fs.readFile(filename[, options], callback)
    readFile(file, options, cb) {
        if(typeof options == "function") {
            cb = options;
            options = {};
        }
        try {
            this.getFile(file); // This throws, or succeeds.
            setImmediate(() => cb(null, this.readFileSync(file, options)));
        } catch(e) {
            cb(e);
        }
    }

    // fs.realpathSync(path[, cache])
    realpathSync(file, opts) {
        var node = this.getNode(file); // This throws, or succeeds.
        return node.path;
    }

    // fs.realpath(path[, cache], callback)
    realpath(filepath, cache, callback) {
        if(typeof cache == "function") callback = cache;
        setImmediate(() => {
            try {
                callback(null, this.realpathSync(filepath, cache));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.statSync(path)
    statSync(p: string) {
        var node = this.getNode(p);
        return node.stats();
    }

    // fs.lstatSync(path)
    lstatSync(p: string) {
        return this.statSync(p);
    }

    // fs.stat(path, callback)
    stat(p: string, callback) {
        setImmediate(() => {
            try {
                callback(null, this.statSync(p));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.lstat(path, callback)
    lstat(p:string, callback) {
        this.stat(p, callback);
    }

    //fs.renameSync(oldPath, newPath)
    renameSync(oldPath, newPath) {
        var node = this.getNode(oldPath);
        oldPath = node.path;
        newPath = resolve(newPath);

        delete this.flattened[oldPath];
        this.flattened[newPath] = node;
        node.path = newPath;
        node.relative = relative(node.layer.mountpoint, newPath);
    }

    //fs.renameSync(oldPath, newPath[, cb])
    rename(oldPath, newPath, callback) {
        setImmediate(() => {
            try {
                this.renameSync(oldPath, newPath);
                if(callback) callback(); // Docs: "Returns nothing or exception."
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    //fs.fstatSync(fd)
    fstatSync(fd: number): Stats {
        return this.getByFd(fd).stats();
    }

    // fs.fstat(fd, callback)
    fstat(fd, callback) {
        setImmediate(() => {
            try {
                callback(null, this.fstatSync(fd));
            } catch(e) {
                callback(e);
            }
        });
    }

    // fs.writeFileSync(filename, data[, options])
    writeFileSync(filename, data, options?: any) {
        let file: File;

        try {
            file = this.getFile(filename);
        } catch(e) { // Try to create a new file.
            const fullPath = resolve(filename);
            const layer = this.getLayerContainingPath(fullPath);
            if(!layer) throw Error('Cannot create new file at this path: ' + fullPath);
            file = this.addFile(fullPath, layer);
        }

        file.setData(data.toString());
    }

    // fs.writeFile(filename, data[, options], callback)
    writeFile(filename, data, options, callback) {
        if(typeof options == "function") {
            callback = options;
            options = null;
        }

        setImmediate(() => {
            try {
                this.writeFileSync(filename, data, options);
                if(callback) callback();
            } catch(e) {
                if(callback) callback(e);
            }
        });
    }

    // fs.existsSync(filename)
    existsSync(filename) {

        // This will make `unionfs` to forward ask next file system for `existsSync`.
        var fullpath = resolve(filename);
        if(!this.getLayerContainingPath(fullpath)) throw('Path not in mount point.');

        try {
            this.getNode(filename);
            return true;
        } catch(e) {
            return false;
        }
    }

    // fs.exists(filename, callback)
    exists(filename, callback) {
        setImmediate(() => {
            callback(this.existsSync(filename));
        });
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

    // fs.openSync(path, flags[, mode])
    openSync(p: string, flags, mode?) {
        var file = this.getFile(p);
        return file.fd;
    }

    // fs.open(path, flags[, mode], callback)
    open(p: string, flags, mode, callback?) {
        if(typeof mode == 'function') {
            callback = mode;
            mode = 438; // 0666
        }
        setImmediate(() => {
            try {
                callback(null, this.openSync(p, flags, mode));
            } catch(e) {
                callback(e);
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
}
