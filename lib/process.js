"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _process;
if (typeof process === 'undefined') {
    _process = {
        getuid: function () { return 0; },
        getgid: function () { return 0; },
        nextTick: require('./setImmediate'),
    };
}
else
    _process = process;
exports.default = _process;
