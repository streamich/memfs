"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("./node");
var volume_1 = require("./volume");
var chai_1 = require("chai");
var path_1 = require("path");
var MOCK_DIR = path_1.join(__dirname, '../test/mock');
describe('volume', function () {
    describe('filenameToSteps(filename): string[]', function () {
        it('/ -> []', function () {
            chai_1.expect(volume_1.filenameToSteps('/')).to.eql([]);
        });
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
        describe('.getLink(steps)', function () {
            var vol = new volume_1.Volume;
            it('[] - Get the root link', function () {
                var link = vol.getLink([]);
                chai_1.expect(link).to.be.an.instanceof(node_1.Link);
                chai_1.expect(link).to.equal(vol.root);
            });
            it('["child.sh"] - Get a child link', function () {
                var link1 = vol.root.createChild('child.sh');
                var link2 = vol.getLink(['child.sh']);
                chai_1.expect(link1).to.equal(link2);
            });
            it('["dir", "child.sh"] - Get a child link in a dir', function () {
                var dir = vol.root.createChild('dir');
                var link1 = dir.createChild('child.sh');
                var node2 = vol.getLink(['dir', 'child.sh']);
                chai_1.expect(link1).to.equal(node2);
            });
        });
        describe('.openSync(path, flags[, mode])', function () {
            var vol = new volume_1.Volume;
            it('Create new file at root (/test.txt)', function () {
                var fd = vol.openSync('/test.txt', 'w');
                chai_1.expect(vol.root.getChild('test.txt')).to.be.an.instanceof(node_1.Link);
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
            it('Open multiple files', function () {
                var fd1 = vol.openSync('/1.json', 'w');
                var fd2 = vol.openSync('/2.json', 'w');
                var fd3 = vol.openSync('/3.json', 'w');
                var fd4 = vol.openSync('/4.json', 'w');
                chai_1.expect(typeof fd1).to.equal('number');
                chai_1.expect(fd1 !== fd2).to.be.true;
                chai_1.expect(fd2 !== fd3).to.be.true;
                chai_1.expect(fd3 !== fd4).to.be.true;
            });
        });
        describe('.open(path, flags[, mode], callback)', function () {
            var vol = new volume_1.Volume;
            it('Create new file at root (/test.txt)', function (done) {
                vol.open('/test.txt', 'w', function (err, fd) {
                    chai_1.expect(err).to.equal(null);
                    chai_1.expect(vol.root.getChild('test.txt')).to.be.an.instanceof(node_1.Link);
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
        describe('.closeSync(fd)', function () {
            var vol = new volume_1.Volume;
            it('Closes file without errors', function () {
                var fd = vol.openSync('/test.txt', 'w');
                vol.closeSync(fd);
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
        describe('.close(fd, callback)', function () {
            var vol = new volume_1.Volume;
            it('Closes file without errors', function (done) {
                vol.open('/test.txt', 'w', function (err, fd) {
                    chai_1.expect(err).to.equal(null);
                    vol.close(fd, function (err) {
                        chai_1.expect(err).to.equal(null);
                        done();
                    });
                });
            });
        });
        describe('.readFileSync(path[, options])', function () {
            var vol = new volume_1.Volume;
            var data = 'trololo';
            var fileNode = vol.createLink(vol.root, 'text.txt').getNode();
            fileNode.setString(data);
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
                var dir1 = vol.createLink(vol.root, 'dir1', true);
                var dir2 = vol.createLink(dir1, 'dir2', true);
                var fileNode = vol.createLink(dir2, 'test-file').getNode();
                var data = 'aaaaaa';
                fileNode.setString(data);
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
        describe('.readFile(path[, options], callback)', function () {
            var vol = new volume_1.Volume;
            var data = 'asdfasdf asdfasdf asdf';
            var fileNode = vol.createLink(vol.root, 'file.txt').getNode();
            fileNode.setString(data);
            it('Read file at root (/file.txt)', function (done) {
                vol.readFile('/file.txt', 'utf8', function (err, str) {
                    chai_1.expect(err).to.equal(null);
                    chai_1.expect(str).to.equal(data);
                    done();
                });
            });
        });
        describe('.writeSync(fd, str, position, encoding)', function () {
            var vol = new volume_1.Volume;
            it('Simple write to a file descriptor', function () {
                var fd = vol.openSync('/test.txt', 'w+');
                var data = 'hello';
                var bytes = vol.writeSync(fd, data);
                vol.closeSync(fd);
                chai_1.expect(bytes).to.equal(data.length);
                chai_1.expect(vol.readFileSync('/test.txt', 'utf8')).to.equal(data);
            });
            it('Multiple writes to a file', function () {
                var fd = vol.openSync('/multi.txt', 'w+');
                var datas = ['hello', ' ', 'world', '!'];
                var bytes = 0;
                for (var _i = 0, datas_1 = datas; _i < datas_1.length; _i++) {
                    var data = datas_1[_i];
                    var b = vol.writeSync(fd, data);
                    chai_1.expect(b).to.equal(data.length);
                    bytes += b;
                }
                vol.closeSync(fd);
                var result = datas.join('');
                chai_1.expect(bytes).to.equal(result.length);
                chai_1.expect(vol.readFileSync('/multi.txt', 'utf8')).to.equal(result);
            });
            it('Overwrite part of file', function () {
                var fd = vol.openSync('/overwrite.txt', 'w+');
                vol.writeSync(fd, 'martini');
                vol.writeSync(fd, 'Armagedon', 1, 'utf8');
                vol.closeSync(fd);
                chai_1.expect(vol.readFileSync('/overwrite.txt', 'utf8')).to.equal('mArmagedon');
            });
        });
        describe('.writeSync(fd, buffer, offset, length, position)', function () {
            var vol = new volume_1.Volume;
            it('Write binary data to file', function () {
                var fd = vol.openSync('/data.bin', 'w+');
                var bytes = vol.writeSync(fd, Buffer.from([1, 2, 3]));
                vol.closeSync(fd);
                chai_1.expect(bytes).to.equal(3);
                chai_1.expect(Buffer.from([1, 2, 3]).equals(vol.readFileSync('/data.bin'))).to.be.true;
            });
        });
        describe('.writeFileSync(path, data[, options])', function () {
            var vol = new volume_1.Volume;
            var data = 'asdfasidofjasdf';
            it('Create a file at root (/writeFileSync.txt)', function () {
                vol.writeFileSync('/writeFileSync.txt', data);
                var node = vol.root.getChild('writeFileSync.txt').getNode();
                chai_1.expect(node).to.be.an.instanceof(node_1.Node);
                chai_1.expect(node.getString()).to.equal(data);
            });
            it('Write to file by file descriptor', function () {
                var fd = vol.openSync('/writeByFd.txt', 'w');
                console.log('fd', fd);
                vol.writeFileSync(fd, data);
                var node = vol.root.getChild('writeByFd.txt').getNode();
                chai_1.expect(node).to.be.an.instanceof(node_1.Node);
                chai_1.expect(node.getString()).to.equal(data);
            });
        });
        describe('.writeFile(path, data[, options], callback)', function () {
            var vol = new volume_1.Volume;
            var data = 'asdfasidofjasdf';
            it('Create a file at root (/writeFile.json)', function (done) {
                vol.writeFile('/writeFile.json', data, function (err) {
                    chai_1.expect(err).to.equal(null);
                    var str = vol.root.getChild('writeFile.json').getNode().getString();
                    chai_1.expect(str).to.equal(data);
                    done();
                });
            });
            it('Throws error when no callback provided', function () {
                try {
                    vol.writeFile('/asdf.txt', 'asdf', 'utf8', undefined);
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err.message).to.equal('callback must be a function');
                }
            });
        });
        describe('.symlinkSync(target, path[, type])', function () {
            var vol = new volume_1.Volume;
            var jquery = vol.createLink(vol.root, 'jquery.js').getNode();
            var data = '"use strict";';
            jquery.setString(data);
            it('Create a symlink', function () {
                vol.symlinkSync('/jquery.js', '/test.js');
                chai_1.expect(vol.root.getChild('test.js')).to.be.an.instanceof(node_1.Link);
                chai_1.expect(vol.root.getChild('test.js').getNode().isSymlink()).to.equal(true);
            });
            it('Read from symlink', function () {
                vol.symlinkSync('/jquery.js', '/test2.js');
                chai_1.expect(vol.readFileSync('/test2.js').toString()).to.equal(data);
            });
        });
        describe('.realpathSync(path[, options])', function () {
            var vol = new volume_1.Volume;
            var mootools = vol.root.createChild('mootools.js');
            var data = 'String.prototype...';
            mootools.getNode().setString(data);
            var symlink = vol.root.createChild('mootools.link.js');
            symlink.getNode().makeSymlink(['mootools.js']);
            it('Symlink works', function () {
                var resolved = vol.resolveSymlinks(symlink);
                chai_1.expect(resolved).to.equal(mootools);
            });
            it('Basic one-jump symlink resolves', function () {
                var path = vol.realpathSync('/mootools.link.js');
                chai_1.expect(path).to.equal('/mootools.js');
            });
            it('Basic one-jump symlink with /./ and /../ in path', function () {
                var path = vol.realpathSync('/./lol/../mootools.link.js');
                chai_1.expect(path).to.equal('/mootools.js');
            });
        });
        describe('.realpath(path[, options], callback)', function () {
            var vol = new volume_1.Volume;
            var mootools = vol.root.createChild('mootools.js');
            var data = 'String.prototype...';
            mootools.getNode().setString(data);
            var symlink = vol.root.createChild('mootools.link.js');
            symlink.getNode().makeSymlink(['mootools.js']);
            it('Basic one-jump symlink resolves', function (done) {
                vol.realpath('/mootools.link.js', function (err, path) {
                    chai_1.expect(path).to.equal('/mootools.js');
                    done();
                });
            });
            it('Basic one-jump symlink with /./ and /../ in path', function () {
                vol.realpath('/./lol/../mootools.link.js', function (err, path) {
                    chai_1.expect(path).to.equal('/mootools.js');
                });
            });
        });
        describe('.lstatSync(path)', function () {
            var vol = new volume_1.Volume;
            var dojo = vol.root.createChild('dojo.js');
            var data = '(funciton(){})();';
            dojo.getNode().setString(data);
            it('Returns basic file stats', function () {
                var stats = vol.lstatSync('/dojo.js');
                chai_1.expect(stats).to.be.an.instanceof(node_1.Stats);
                chai_1.expect(stats.size).to.equal(data.length);
                chai_1.expect(stats.isFile()).to.be.true;
                chai_1.expect(stats.isDirectory()).to.be.false;
            });
            it('Stats on symlink returns results about the symlink', function () {
                vol.symlinkSync('/dojo.js', '/link.js');
                var stats = vol.lstatSync('/link.js');
                chai_1.expect(stats.isSymbolicLink()).to.be.true;
                chai_1.expect(stats.isFile()).to.be.false;
                chai_1.expect(stats.size).to.equal(0);
            });
        });
        describe('.statSync(path)', function () {
            var vol = new volume_1.Volume;
            var dojo = vol.root.createChild('dojo.js');
            var data = '(funciton(){})();';
            dojo.getNode().setString(data);
            it('Returns basic file stats', function () {
                var stats = vol.statSync('/dojo.js');
                chai_1.expect(stats).to.be.an.instanceof(node_1.Stats);
                chai_1.expect(stats.size).to.equal(data.length);
                chai_1.expect(stats.isFile()).to.be.true;
                chai_1.expect(stats.isDirectory()).to.be.false;
            });
            it('Stats on symlink returns results about the resolved file', function () {
                vol.symlinkSync('/dojo.js', '/link.js');
                var stats = vol.statSync('/link.js');
                chai_1.expect(stats.isSymbolicLink()).to.be.false;
                chai_1.expect(stats.isFile()).to.be.true;
                chai_1.expect(stats.size).to.equal(data.length);
            });
        });
        describe('.fstatSync(fd)', function () {
            var vol = new volume_1.Volume;
            var dojo = vol.root.createChild('dojo.js');
            var data = '(funciton(){})();';
            dojo.getNode().setString(data);
            it('Returns basic file stats', function () {
                var fd = vol.openSync('/dojo.js', 'r');
                var stats = vol.fstatSync(fd);
                chai_1.expect(stats).to.be.an.instanceof(node_1.Stats);
                chai_1.expect(stats.size).to.equal(data.length);
                chai_1.expect(stats.isFile()).to.be.true;
                chai_1.expect(stats.isDirectory()).to.be.false;
            });
        });
        describe('.linkSync(existingPath, newPath)', function () {
            var vol = new volume_1.Volume;
            it('Create a new link', function () {
                var data = '123';
                vol.writeFileSync('/1.txt', data);
                vol.linkSync('/1.txt', '/2.txt');
                chai_1.expect(vol.readFileSync('/1.txt', 'utf8')).to.equal(data);
                chai_1.expect(vol.readFileSync('/2.txt', 'utf8')).to.equal(data);
            });
            it('nlink property of i-node increases when new link is created', function () {
                vol.writeFileSync('/a.txt', '123');
                vol.linkSync('/a.txt', '/b.txt');
                vol.linkSync('/a.txt', '/c.txt');
                var stats = vol.statSync('/b.txt');
                chai_1.expect(stats.nlink).to.equal(3);
            });
        });
        describe('.readdirSync(path)', function () {
            var vol = new volume_1.Volume;
            it('Returns simple list', function () {
                vol.writeFileSync('/1.js', '123');
                vol.writeFileSync('/2.js', '123');
                var list = vol.readdirSync('/');
                chai_1.expect(list.length).to.equal(2);
                chai_1.expect(list).to.eql(['1.js', '2.js']);
            });
        });
    });
});
