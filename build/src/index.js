"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var volume_1 = require("./volume");
var constants_1 = require("./constants");
exports.constants = constants_1.constants;
exports.F_OK = constants_1.constants.F_OK;
exports.R_OK = constants_1.constants.R_OK;
exports.W_OK = constants_1.constants.W_OK;
exports.X_OK = constants_1.constants.X_OK;
exports.volume = new volume_1.Volume;
var FS_METHODS = [
    'readFileSync',
    'writeFileSync',
];
exports.fs = {};
for (var _i = 0, FS_METHODS_1 = FS_METHODS; _i < FS_METHODS_1.length; _i++) {
    var method = FS_METHODS_1[_i];
    exports.fs[method] = exports.volume[method].bind(exports.volume);
}
module.exports = __assign({}, module.exports, exports.fs);
