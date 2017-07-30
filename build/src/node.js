"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var process_1 = require("./process");
var Node = (function () {
    function Node(relative, layer) {
        this.fd = Node.fd--;
        this.uid = process_1.default.getuid();
        this.gid = process_1.default.getgid();
        this.atime = new Date;
        this.mtime = new Date;
        this.ctime = new Date;
        this.relative = relative;
        this.path = path_1.resolve(layer.mountpoint, relative);
        this.layer = layer;
    }
    Node.prototype.getData = function () {
        return '';
    };
    Node.prototype.setData = function (data) {
    };
    Node.prototype.getPath = function () {
        return this.path;
    };
    Node.prototype.stats = function () {
        return Stats.build(this);
    };
    Node.prototype.chown = function (uid, gid) {
        this.uid = uid;
        this.gid = gid;
    };
    Node.fd = -128;
    return Node;
}());
exports.Node = Node;
var File = (function (_super) {
    __extends(File, _super);
    function File() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.position = 0;
        return _this;
    }
    File.prototype.getData = function () {
        return this.layer.files[this.relative];
    };
    File.prototype.setData = function (data) {
        this.layer.files[this.relative] = data.toString();
    };
    File.prototype.truncate = function (len) {
        if (len === void 0) { len = 0; }
        this.setData(this.getData().substr(0, len));
    };
    return File;
}(Node));
exports.File = File;
var Directory = (function (_super) {
    __extends(Directory, _super);
    function Directory() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Directory;
}(Node));
exports.Directory = Directory;
var Stats = (function () {
    function Stats() {
        this.uid = process_1.default.getuid();
        this.gid = process_1.default.getgid();
        this.rdev = 0;
        this.blksize = 4096;
        this.ino = 0;
        this.size = 0;
        this.blocks = 1;
        this.atime = new Date;
        this.mtime = new Date;
        this.ctime = new Date;
        this.birthtime = new Date;
        this.dev = 0;
        this.mode = 0;
        this.nlink = 0;
        this._isFile = false;
        this._isDirectory = false;
    }
    Stats.build = function (node) {
        var stats = new Stats;
        stats.uid = node.uid;
        stats.gid = node.gid;
        stats.atime = node.atime;
        stats.mtime = node.mtime;
        stats.ctime = node.ctime;
        if (node instanceof Directory) {
            stats._isDirectory = true;
        }
        else if (node instanceof File) {
            var data = node.getData();
            stats.size = data.length;
            stats._isFile = true;
        }
        return stats;
    };
    Stats.prototype.isFile = function () {
        return this._isFile;
    };
    Stats.prototype.isDirectory = function () {
        return this._isDirectory;
    };
    Stats.prototype.isSymbolicLink = function () {
        return false;
    };
    return Stats;
}());
exports.Stats = Stats;
