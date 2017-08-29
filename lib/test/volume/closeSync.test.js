"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("../..");
var chai_1 = require("chai");
describe('.closeSync(fd)', function () {
    var vol = new __1.Volume;
    it('Closes file without errors', function () {
        var fd = vol.openSync('/test.txt', 'w');
        vol.closeSync(fd);
    });
    it('Correct error when file descriptor is not a number', function () {
        var vol = __1.Volume.fromJSON({ '/foo': 'bar' });
        try {
            var fd = vol.openSync('/foo', 'r');
            vol.closeSync(String(fd));
            throw Error('This should not throw');
        }
        catch (err) {
            chai_1.expect(err.message).to.equal('fd must be a file descriptor');
        }
    });
    it('Closing file descriptor that does not exist', function () {
        var vol = new __1.Volume;
        try {
            vol.closeSync(1234);
            throw Error('This should not throw');
        }
        catch (err) {
            chai_1.expect(err.code).to.equal('EBADF');
        }
    });
    it('Closing same file descriptor twice throws EBADF', function () {
        var fd = vol.openSync('/test.txt', 'w');
        vol.closeSync(fd);
        try {
            vol.closeSync(fd);
            throw Error('This should not throw');
        }
        catch (err) {
            chai_1.expect(err.code).to.equal('EBADF');
        }
    });
    it('Closing a file decreases the number of open files', function () {
        var fd = vol.openSync('/test.txt', 'w');
        var openFiles = vol.openFiles;
        vol.closeSync(fd);
        chai_1.expect(openFiles).to.be.greaterThan(vol.openFiles);
    });
    it('When closing a file, its descriptor is added to the pool of descriptors to be reused', function () {
        var fd = vol.openSync('/test.txt', 'w');
        var usedFdLength = vol.releasedFds.length;
        vol.closeSync(fd);
        chai_1.expect(usedFdLength).to.be.lessThan(vol.releasedFds.length);
    });
});
