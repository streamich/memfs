"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('WriteStream', function () {
    it('fs has WriteStream constructor', function () {
        var fs = util_1.createFs();
        chai_1.expect(typeof fs.WriteStream).to.equal('function');
    });
    it('WriteStream has constructor and prototype property', function () {
        var fs = util_1.createFs();
        chai_1.expect(typeof fs.WriteStream.constructor).to.equal('function');
        chai_1.expect(typeof fs.WriteStream.prototype).to.equal('object');
    });
    it('Can write basic file', function (done) {
        var fs = util_1.createFs({ '/a': 'b' });
        var ws = new fs.WriteStream('/a', 'utf8');
        ws.end('d');
        ws.on('finish', function () {
            chai_1.expect(fs.readFileSync('/a', 'utf8')).to.equal('d');
            done();
        });
    });
});
