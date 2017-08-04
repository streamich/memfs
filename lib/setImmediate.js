"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _setImmediate;
if (typeof setImmediate === 'function')
    _setImmediate = setImmediate;
else
    _setImmediate = setTimeout;
exports.default = _setImmediate;
