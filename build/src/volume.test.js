"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("./node");
var volume_1 = require("./volume");
var chai_1 = require("chai");
var path_1 = require("path");
var MOCK_DIR = path_1.join(__dirname, '../test/mock');
describe('volume', function () {
    describe('filenameToSteps(filename): string[]', function () {
        it('/test -> ["test"]', function () {
            chai_1.expect(volume_1.filenameToSteps('/test')).to.eql(['test']);
        });
        it('/usr/bin/node.sh -> ["usr", "bin", "node.sh"]', function () {
            chai_1.expect(volume_1.filenameToSteps('/usr/bin/node.sh')).to.eql(['usr', 'bin', 'node.sh']);
        });
        it('/dir/file.txt -> ["dir", "file.txt"]', function () {
            chai_1.expect(volume_1.filenameToSteps('/dir/file.txt')).to.eql(['dir', 'file.txt']);
        });
        it('/dir/./file.txt -> ["dir", "file.txt"]', function () {
            chai_1.expect(volume_1.filenameToSteps('/dir/./file.txt')).to.eql(['dir', 'file.txt']);
        });
        it('/dir/../file.txt -> ["file.txt"]', function () {
            chai_1.expect(volume_1.filenameToSteps('/dir/../file.txt')).to.eql(['file.txt']);
        });
    });
    describe('Volume', function () {
        describe('.getNode(steps)', function () {
            var vol = (new volume_1.Volume);
            it('[] - Get the root node', function () {
                var node = vol.getNode([]);
                chai_1.expect(node).to.be.an.instanceof(node_1.Node);
                chai_1.expect(node).to.equal(vol.root);
            });
            it('["child.sh"] - Get a child node', function () {
                var node1 = vol.root.createChild('child.sh');
                var node2 = vol.getNode(['child.sh']);
                chai_1.expect(node1).to.equal(node2);
            });
            it('["dir", "child.sh"] - Get a child node in a dir', function () {
                var dir = vol.root.createChild('dir');
                var node1 = dir.createChild('child.sh');
                var node2 = vol.getNode(['dir', 'child.sh']);
                chai_1.expect(node1).to.equal(node2);
            });
        });
        describe('.openSync(path, flags[, mode])', function () {
            var vol = new volume_1.Volume;
            it('Create new file at root (/test.txt)', function () {
                var fd = vol.openSync('/test.txt', 'w');
                chai_1.expect(vol.root.children['test.txt']).to.be.an.instanceof(node_1.Node);
                chai_1.expect(typeof fd).to.equal('number');
                chai_1.expect(fd).to.be.greaterThan(0);
            });
            it('Error on file not found', function () {
                try {
                    vol.openSync('/non-existing-file.txt', 'r');
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err.code).to.equal('ENOENT');
                }
            });
            it('Invalid path correct error code', function () {
                try {
                    vol.openSync(123, 'r');
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                    chai_1.expect(err.message).to.equal('path must be a string or Buffer');
                }
            });
            it('Invalid flags correct error code', function () {
                try {
                    vol.openSync('/non-existing-file.txt');
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err.code).to.equal('ERR_INVALID_OPT_VALUE');
                }
            });
            it('Invalid mode correct error code', function () {
                try {
                    vol.openSync('/non-existing-file.txt', 'r', 'adfasdf');
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                    chai_1.expect(err.message).to.equal('mode must be an int');
                }
            });
        });
        describe('.open(path, flags[, mode], callback)', function () {
            var vol = new volume_1.Volume;
            it('Create new file at root (/test.txt)', function (done) {
                vol.open('/test.txt', 'w', function (err, fd) {
                    chai_1.expect(err).to.equal(null);
                    chai_1.expect(vol.root.children['test.txt']).to.be.an.instanceof(node_1.Node);
                    chai_1.expect(typeof fd).to.equal('number');
                    chai_1.expect(fd).to.be.greaterThan(0);
                    done();
                });
            });
            it('Error on file not found', function (done) {
                vol.open('/non-existing-file.txt', 'r', function (err, fd) {
                    chai_1.expect(err.code).to.equal('ENOENT');
                    done();
                });
            });
            it('Invalid path correct error code thrown synchronously', function (done) {
                try {
                    vol.open(123, 'r', function (err, fd) {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                    chai_1.expect(err.message).to.equal('path must be a string or Buffer');
                    done();
                }
            });
            it('Invalid flags correct error code thrown synchronously', function (done) {
                try {
                    vol.open('/non-existing-file.txt', undefined, function () {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err.code).to.equal('ERR_INVALID_OPT_VALUE');
                    done();
                }
            });
            it('Invalid mode correct error code thrown synchronously', function (done) {
                try {
                    vol.openSync('/non-existing-file.txt', 'r', 'adfasdf', function () {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                    chai_1.expect(err.message).to.equal('mode must be an int');
                    done();
                }
            });
        });
        describe('.readFileSync(path[, options])', function () {
            var vol = new volume_1.Volume;
            var data = 'trololo';
            var fileNode = vol.root.createChild('text.txt', false);
            fileNode.setData(data);
            it('Read file at root (/text.txt)', function () {
                var buf = vol.readFileSync('/text.txt');
                var str = buf.toString();
                chai_1.expect(buf).to.be.instanceof(Buffer);
                chai_1.expect(str).to.equal(data);
            });
            it('Specify encoding as string', function () {
                var str = vol.readFileSync('/text.txt', 'utf8');
                chai_1.expect(str).to.equal(data);
            });
            it('Specify encoding in object', function () {
                var str = vol.readFileSync('/text.txt', { encoding: 'utf8' });
                chai_1.expect(str).to.equal(data);
            });
            it('Read file deep in tree (/dir1/dir2/test-file)', function () {
                var dir1 = vol.root.createChild('dir1', true);
                var dir2 = dir1.createChild('dir2', true);
                var fileNode = dir2.createChild('test-file', false);
                var data = 'aaaaaa';
                fileNode.setData(data);
                var str = vol.readFileSync('/dir1/dir2/test-file').toString();
                chai_1.expect(str).to.equal(data);
            });
            it('Invalid options should throw', function () {
                try {
                    vol.readFileSync('/text.txt', 123);
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                }
            });
        });
        describe('.writeFileSync(path, data[, options])', function () {
            var vol = new volume_1.Volume;
            var data = 'asdfasidofjasdf';
            it('Create a file at root (/writeFileSync.txt)', function () {
                vol.writeFileSync('/writeFileSync.txt', data);
                var node = vol.root.children['writeFileSync.txt'];
                chai_1.expect(node).to.be.an.instanceof(node_1.Node);
                chai_1.expect(node.getData()).to.equal(data);
            });
            it('Write to file by file descriptor', function () {
                var fd = vol.openSync('/writeByFd.txt', 'w');
                vol.writeFileSync(fd, data);
                var node = vol.root.children['writeByFd.txt'];
                chai_1.expect(node).to.be.an.instanceof(node_1.Node);
                chai_1.expect(node.getData()).to.equal(data);
            });
        });
    });
});
