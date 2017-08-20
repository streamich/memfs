"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('appendFileSync(file, data, options)', function () {
    it('Simple write to non-existing file', function () {
        var vol = util_1.create();
        vol.appendFileSync('/test', 'hello');
        chai_1.expect(vol.readFileSync('/test', 'utf8')).to.equal('hello');
    });
    it('Append to existing file', function () {
        var vol = util_1.create({ '/a': 'b' });
        vol.appendFileSync('/a', 'c');
        chai_1.expect(vol.readFileSync('/a', 'utf8')).to.equal('bc');
    });
});
