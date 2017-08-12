"use strict";
// Here we mock the global `process` variable in case we are not in Node's environment.
Object.defineProperty(exports, "__esModule", { value: true });
function createProcess(p) {
    if (p === void 0) { p = process; }
    if (!p) {
        try {
            p = require('process');
        }
        catch (e) { }
    }
    if (!p)
        p = {};
    if (!p.getuid)
        p.getuid = function () { return 0; };
    if (!p.getgid)
        p.getgid = function () { return 0; };
    if (!p.cwd)
        p.cwd = function () { return '/'; };
    if (!p.nextTick)
        p.nextTick = require('./setImmediate').default;
    return p;
}
exports.createProcess = createProcess;
exports.default = createProcess();
