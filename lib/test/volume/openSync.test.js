"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("../..");
var chai_1 = require("chai");
describe('openSync(path, mode[, flags])', function () {
    it('should return a file descriptor', function () {
        var fd = __1.fs.openSync('/foo', 'w');
        chai_1.expect(typeof fd).to.equal('number');
    });
});
