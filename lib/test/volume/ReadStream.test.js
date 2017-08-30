"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('ReadStream', function () {
    it('fs has ReadStream constructor', function () {
        var fs = util_1.createFs();
        chai_1.expect(typeof fs.ReadStream).to.equal('function');
    });
    it('ReadStream has constructor and prototype property', function () {
        var fs = util_1.createFs();
        chai_1.expect(typeof fs.ReadStream.constructor).to.equal('function');
        chai_1.expect(typeof fs.ReadStream.prototype).to.equal('object');
    });
    it('Can read basic file', function (done) {
        var fs = util_1.createFs({ '/a': 'b' });
        var rs = new fs.ReadStream('/a', 'utf8');
        rs.on('data', function (data) {
            chai_1.expect(String(data)).to.equal('b');
            done();
        });
    });
});
