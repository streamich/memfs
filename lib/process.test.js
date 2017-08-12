"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var process_1 = require("./process");
describe('process', function () {
    describe('createProcess', function () {
        var proc = process_1.createProcess();
        it('Exports default object', function () {
            chai_1.expect(typeof process_1.default).to.equal('object');
        });
        it('.getuid() and .getgid()', function () {
            chai_1.expect(proc.getuid()).to.be.a('number');
            chai_1.expect(proc.getgid()).to.be.a('number');
        });
        it('.cwd()', function () {
            chai_1.expect(proc.cwd()).to.be.a('string');
        });
        it('.nextTick()', function (done) {
            chai_1.expect(proc.nextTick).to.be.a('function');
            proc.nextTick(done);
        });
    });
});
