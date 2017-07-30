"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var volume_1 = require("./volume");
exports.fs = new volume_1.Volume;
exports.fs.mountSync();
exports.mountSync = exports.fs.mountSync.bind(exports.fs);
exports.readFileSync = exports.fs.readFileSync.bind(exports.fs);
exports.writeFileSync = exports.fs.writeFileSync.bind(exports.fs);
