"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var process_1 = require("./process");
var constants_1 = require("./constants");
var S_IFMT = constants_1.constants.S_IFMT, S_IFDIR = constants_1.constants.S_IFDIR, S_IFREG = constants_1.constants.S_IFREG, S_IFBLK = constants_1.constants.S_IFBLK, S_IFCHR = constants_1.constants.S_IFCHR, S_IFLNK = constants_1.constants.S_IFLNK, S_IFIFO = constants_1.constants.S_IFIFO, S_IFSOCK = constants_1.constants.S_IFSOCK;
exports.SEP = '/';
var Node = (function () {
    function Node(ino, perm) {
        if (perm === void 0) { perm = 438; }
        this.uid = process_1.default.getuid();
        this.gid = process_1.default.getgid();
        this.atime = new Date;
        this.mtime = new Date;
        this.ctime = new Date;
        this.buf = null;
        this.perm = 438;
        this.mode = S_IFREG;
        this.nlink = 1;
        this.symlink = null;
        this.perm = perm;
        this.ino = ino;
    }
    Node.prototype.getString = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return this.getBuffer().toString(encoding);
    };
    Node.prototype.setString = function (str) {
        this.buf = Buffer.from(str, 'utf8');
    };
    Node.prototype.getBuffer = function () {
        if (!this.buf)
            this.setBuffer(Buffer.allocUnsafe(0));
        return Buffer.from(this.buf);
    };
    Node.prototype.setBuffer = function (buf) {
        this.buf = Buffer.from(buf);
    };
    Node.prototype.getSize = function () {
        return this.buf ? this.buf.length : 0;
    };
    Node.prototype.setModeProperty = function (property) {
        this.mode = (this.mode & ~S_IFMT) | property;
    };
    Node.prototype.setIsFile = function () {
        this.setModeProperty(S_IFREG);
    };
    Node.prototype.setIsDirectory = function () {
        this.setModeProperty(S_IFDIR);
    };
    Node.prototype.setIsSymlink = function () {
        this.setModeProperty(S_IFLNK);
    };
    Node.prototype.isDirectory = function () {
        return (this.mode & S_IFMT) === S_IFDIR;
    };
    Node.prototype.isSymlink = function () {
        return (this.mode & S_IFMT) === S_IFLNK;
    };
    Node.prototype.makeSymlink = function (steps) {
        this.symlink = steps;
        this.setIsSymlink();
    };
    Node.prototype.chown = function (uid, gid) {
        this.uid = uid;
        this.gid = gid;
    };
    Node.prototype.write = function (buf, off, len, pos) {
        if (off === void 0) { off = 0; }
        if (len === void 0) { len = buf.length; }
        if (pos === void 0) { pos = 0; }
        if (!this.buf)
            this.buf = Buffer.allocUnsafe(0);
        if (pos + len > this.buf.length) {
            var newBuf = Buffer.allocUnsafe(pos + len);
            this.buf.copy(newBuf, 0, 0, this.buf.length);
            this.buf = newBuf;
        }
        buf.copy(this.buf, pos, off, off + len);
        return len;
    };
    return Node;
}());
exports.Node = Node;
var Link = (function () {
    function Link(vol, parent, name) {
        this.parent = null;
        this.children = {};
        this.steps = [];
        this.node = null;
        this.ino = 0;
        this.length = 0;
        this.vol = vol;
        this.parent = parent;
        this.steps = parent ? parent.steps.concat([name]) : [name];
    }
    Link.prototype.setNode = function (node) {
        this.node = node;
        this.ino = node.ino;
    };
    Link.prototype.getNode = function () {
        return this.node;
    };
    Link.prototype.createChild = function (name, node) {
        if (node === void 0) { node = this.vol.createNode(); }
        var link = new Link(this.vol, this, name);
        link.setNode(node);
        if (node.isDirectory()) {
        }
        this.setChild(name, link);
        return link;
    };
    Link.prototype.setChild = function (name, link) {
        if (link === void 0) { link = new Link(this.vol, this, name); }
        this.children[name] = link;
        link.parent = this;
        this.length++;
        return link;
    };
    Link.prototype.deleteChild = function (link) {
        delete this.children[link.getName()];
        this.length--;
    };
    Link.prototype.getChild = function (name) {
        return this.children[name];
    };
    Link.prototype.getPath = function () {
        return this.steps.join(exports.SEP);
    };
    Link.prototype.getName = function () {
        return this.steps[this.steps.length - 1];
    };
    Link.prototype.walk = function (steps, stop, i) {
        if (stop === void 0) { stop = steps.length; }
        if (i === void 0) { i = 0; }
        if (i >= steps.length)
            return this;
        if (i >= stop)
            return this;
        var step = steps[i];
        var link = this.getChild(step);
        if (!link)
            return null;
        return link.walk(steps, stop, i + 1);
    };
    return Link;
}());
exports.Link = Link;
var File = (function () {
    function File(link, node, flags, fd) {
        this.link = null;
        this.node = null;
        this.position = 0;
        this.link = link;
        this.node = node;
        this.flags = flags;
        if (typeof fd !== 'number')
            this.fd = File.fd--;
    }
    File.prototype.getString = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return this.node.getString();
    };
    File.prototype.setString = function (str) {
        this.node.setString(str);
    };
    File.prototype.getBuffer = function () {
        return this.node.getBuffer();
    };
    File.prototype.setBuffer = function (buf) {
        this.node.setBuffer(buf);
    };
    File.prototype.getSize = function () {
        return this.node.getSize();
    };
    File.prototype.truncate = function (len) {
        if (len === void 0) { len = 0; }
        this.setString(this.getString().substr(0, len));
    };
    File.prototype.seekTo = function (position) {
        this.position = position;
    };
    File.prototype.stats = function () {
        return Stats.build(this.node);
    };
    File.prototype.write = function (buf, offset, length, position) {
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = buf.length; }
        if (typeof position !== 'number')
            position = this.position;
        var bytes = this.node.write(buf, offset, length, position);
        this.position = position + length;
        return bytes;
    };
    File.fd = 0xFFFFFFFF;
    return File;
}());
exports.File = File;
var Stats = (function () {
    function Stats() {
        this.uid = 0;
        this.gid = 0;
        this.rdev = 0;
        this.blksize = 4096;
        this.ino = 0;
        this.size = 0;
        this.blocks = 1;
        this.atime = null;
        this.mtime = null;
        this.ctime = null;
        this.birthtime = null;
        this.atimeMs = 0.0;
        this.mtimeMs = 0.0;
        this.ctimeMs = 0.0;
        this.birthtimeMs = 0.0;
        this.dev = 0;
        this.mode = 0;
        this.nlink = 0;
    }
    Stats.build = function (node) {
        var stats = new Stats;
        var uid = node.uid, gid = node.gid, atime = node.atime, mtime = node.mtime, ctime = node.ctime, mode = node.mode, ino = node.ino;
        stats.uid = uid;
        stats.gid = gid;
        stats.atime = atime;
        stats.mtime = mtime;
        stats.ctime = ctime;
        stats.birthtime = ctime;
        stats.atimeMs = atime.getTime();
        stats.mtimeMs = mtime.getTime();
        var ctimeMs = ctime.getTime();
        stats.ctimeMs = ctimeMs;
        stats.birthtimeMs = ctimeMs;
        stats.size = node.getSize();
        stats.mode = node.mode;
        stats.ino = node.ino;
        stats.nlink = node.nlink;
        return stats;
    };
    Stats.prototype._checkModeProperty = function (property) {
        return (this.mode & S_IFMT) === property;
    };
    Stats.prototype.isDirectory = function () {
        return this._checkModeProperty(S_IFDIR);
    };
    Stats.prototype.isFile = function () {
        return this._checkModeProperty(S_IFREG);
    };
    Stats.prototype.isBlockDevice = function () {
        return this._checkModeProperty(S_IFBLK);
    };
    Stats.prototype.isCharacterDevice = function () {
        return this._checkModeProperty(S_IFCHR);
    };
    Stats.prototype.isSymbolicLink = function () {
        return this._checkModeProperty(S_IFLNK);
    };
    Stats.prototype.isFIFO = function () {
        return this._checkModeProperty(S_IFIFO);
    };
    Stats.prototype.isSocket = function () {
        return this._checkModeProperty(S_IFSOCK);
    };
    return Stats;
}());
exports.Stats = Stats;
