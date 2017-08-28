"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('existsSync(path)', function () {
    var vol = util_1.create();
    it('Returns true if file exists', function () {
        var result = vol.existsSync('/foo');
        chai_1.expect(result).to.be.true;
    });
    it('Returns false if file does not exist', function () {
        var result = vol.existsSync('/foo2');
        chai_1.expect(result).to.be.false;
    });
    it('invalid path type should not throw', function () {
        chai_1.expect(vol.existsSync(123)).to.be.false;
    });
});
