"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
var node_1 = require("../../node");
describe('writeFileSync(path, data[, options])', function () {
    var data = 'asdfasidofjasdf';
    it('Create a file at root (/writeFileSync.txt)', function () {
        var vol = util_1.create();
        vol.writeFileSync('/writeFileSync.txt', data);
        var node = vol.root.getChild('writeFileSync.txt').getNode();
        chai_1.expect(node).to.be.an.instanceof(node_1.Node);
        chai_1.expect(node.getString()).to.equal(data);
    });
    it('Write to file by file descriptor', function () {
        var vol = util_1.create();
        var fd = vol.openSync('/writeByFd.txt', 'w');
        vol.writeFileSync(fd, data);
        var node = vol.root.getChild('writeByFd.txt').getNode();
        chai_1.expect(node).to.be.an.instanceof(node_1.Node);
        chai_1.expect(node.getString()).to.equal(data);
    });
    it('Write to two files (second by fd)', function () {
        var vol = util_1.create();
        // 1
        vol.writeFileSync('/1.txt', '123');
        // 2, 3, 4
        var fd2 = vol.openSync('/2.txt', 'w');
        var fd3 = vol.openSync('/3.txt', 'w');
        var fd4 = vol.openSync('/4.txt', 'w');
        vol.writeFileSync(fd2, '456');
        chai_1.expect(vol.root.getChild('1.txt').getNode().getString()).to.equal('123');
        chai_1.expect(vol.root.getChild('2.txt').getNode().getString()).to.equal('456');
    });
    it('Write at relative path that does not exist throws correct error', function () {
        var vol = util_1.create();
        try {
            vol.writeFileSync('a/b', 'c');
            throw new Error('not_this');
        }
        catch (err) {
            chai_1.expect(err.code).to.equal('ENOENT');
        }
    });
});
