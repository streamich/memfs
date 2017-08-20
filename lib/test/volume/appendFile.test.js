"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('appendFile(file, data[, options], callback)', function () {
    it('Simple write to non-existing file', function (done) {
        var vol = util_1.create();
        vol.appendFile('/test', 'hello', function (err, res) {
            chai_1.expect(vol.readFileSync('/test', 'utf8')).to.equal('hello');
            done();
        });
    });
    it('Append to existing file', function (done) {
        var vol = util_1.create({ '/a': 'b' });
        vol.appendFile('/a', 'c', function (err, res) {
            chai_1.expect(vol.readFileSync('/a', 'utf8')).to.equal('bc');
            done();
        });
    });
});
