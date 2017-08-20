"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("../..");
exports.create = function (json) {
    if (json === void 0) { json = { '/foo': 'bar' }; }
    var vol = __1.Volume.fromJSON(json);
    return vol;
};
