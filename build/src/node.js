"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var process_1 = require("./process");
exports.SEP = '/';
var Node = (function () {
    function Node(parent, name, isDirectory, mode) {
        if (isDirectory === void 0) { isDirectory = false; }
        if (mode === void 0) { mode = 438; }
        this.parent = null;
        this.children = {};
        this.steps = [];
        this.uid = process_1.default.getuid();
        this.gid = process_1.default.getgid();
        this.atime = new Date;
        this.mtime = new Date;
        this.ctime = new Date;
        this.data = '';
        this._isDirectory = false;
        this._isSymlink = false;
        this.mode = 438;
        this.parent = parent;
        this.steps = parent ? parent.steps.concat([name]) : [name];
        this._isDirectory = isDirectory;
        this.mode = mode;
    }
    Node.prototype.getChild = function (name) {
        return this.children[name];
    };
    Node.prototype.createChild = function (name, isDirectory, mode) {
        var node = new Node(this, name, isDirectory, mode);
        this.children[name] = node;
        return node;
    };
    Node.prototype.getPath = function () {
        return exports.SEP + this.steps.join(exports.SEP);
    };
    Node.prototype.getData = function () {
        return this.data;
    };
    Node.prototype.setData = function (data) {
        this.data = String(data);
    };
    Node.prototype.isDirectory = function () {
        return this._isDirectory;
    };
    Node.prototype.isSymlink = function () {
        return this._isSymlink;
    };
    Node.prototype.chown = function (uid, gid) {
        this.uid = uid;
        this.gid = gid;
    };
    Node.prototype.walk = function (steps, stop, i) {
        if (stop === void 0) { stop = steps.length; }
        if (i === void 0) { i = 0; }
        if (i >= steps.length)
            return this;
        if (i >= stop)
            return this;
        var step = steps[i];
        var node = this.getChild(step);
        if (!node)
            return null;
        return node.walk(steps, stop, i + 1);
    };
    return Node;
}());
exports.Node = Node;
var File = (function () {
    function File(node, flags) {
        this.fd = File.fd--;
        this.node = null;
        this.offset = 0;
        this.node = node;
        this.flags = flags;
    }
    File.prototype.getData = function () {
        return this.node.getData();
    };
    File.prototype.setData = function (data) {
        this.node.setData(data);
    };
    File.prototype.truncate = function (len) {
        if (len === void 0) { len = 0; }
        this.setData(this.getData().substr(0, len));
    };
    File.prototype.seek = function (offset) {
        this.offset = offset;
    };
    File.prototype.stats = function () {
        return Stats.build(this);
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
        this.dev = 0;
        this.mode = 0;
        this.nlink = 0;
        this._isFile = false;
        this._isDirectory = false;
        this._isSymbolicLink = false;
    }
    Stats.build = function (fd) {
        var stats = new Stats;
        var node = fd.node;
        stats.uid = node.uid;
        stats.gid = node.gid;
        stats.atime = node.atime;
        stats.mtime = node.mtime;
        stats.ctime = node.ctime;
        stats.size = node.getData().length;
        if (node.isDirectory())
            stats._isDirectory = true;
        else if (node.isSymlink())
            stats._isSymbolicLink = true;
        else
            stats._isFile = true;
        return stats;
    };
    Stats.prototype.isFile = function () {
        return this._isFile;
    };
    Stats.prototype.isDirectory = function () {
        return this._isDirectory;
    };
    Stats.prototype.isSymbolicLink = function () {
        return this._isSymbolicLink;
    };
    return Stats;
}());
exports.Stats = Stats;
