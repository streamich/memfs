"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _setImmediate;
/* istanbul ignore next */
if (typeof setImmediate === 'function')
    _setImmediate = setImmediate;
else
    _setImmediate = setTimeout;
exports.default = _setImmediate;
