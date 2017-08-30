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
        it('.genRndStr()', function () {
            var vol = new volume_1.Volume;
            for (var i = 0; i < 100; i++) {
                var str = vol.genRndStr();
                chai_1.expect(typeof str === 'string').to.be.true;
                chai_1.expect(str.length).to.equal(6);
            }
        });
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
        describe('.toJSON()', function () {
            it('Single file', function () {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/test', 'Hello');
                chai_1.expect(vol.toJSON()).to.eql({ '/test': 'Hello' });
            });
            it('Multiple files', function () {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/test', 'Hello');
                vol.writeFileSync('/test2', 'Hello2');
                vol.writeFileSync('/test.txt', 'Hello3');
                chai_1.expect(vol.toJSON()).to.eql({
                    '/test': 'Hello',
                    '/test2': 'Hello2',
                    '/test.txt': 'Hello3',
                });
            });
            it('With folders, skips empty folders', function () {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/test', 'Hello');
                vol.mkdirSync('/dir');
                vol.mkdirSync('/dir/dir2');
                // Folder `/dir3` will be empty, and should not be in the JSON aoutput.
                vol.mkdirSync('/dir3');
                vol.writeFileSync('/dir/abc', 'abc');
                vol.writeFileSync('/dir/abc2', 'abc2');
                vol.writeFileSync('/dir/dir2/hello.txt', 'world');
                chai_1.expect(vol.toJSON()).to.eql({
                    '/test': 'Hello',
                    '/dir/abc': 'abc',
                    '/dir/abc2': 'abc2',
                    '/dir/dir2/hello.txt': 'world',
                });
            });
            it('Specify export path', function () {
                var vol = volume_1.Volume.fromJSON({
                    '/foo': 'bar',
                    '/dir/a': 'b',
                });
                chai_1.expect(vol.toJSON('/dir')).to.eql({
                    '/dir/a': 'b',
                });
            });
            it('Specify multiple export paths', function () {
                var vol = volume_1.Volume.fromJSON({
                    '/foo': 'bar',
                    '/dir/a': 'b',
                    '/dir2/a': 'b',
                    '/dir2/c': 'd',
                });
                chai_1.expect(vol.toJSON(['/dir2', '/dir'])).to.eql({
                    '/dir/a': 'b',
                    '/dir2/a': 'b',
                    '/dir2/c': 'd',
                });
            });
            it('Accumulate exports on supplied object', function () {
                var vol = volume_1.Volume.fromJSON({
                    '/foo': 'bar',
                });
                var obj = {};
                chai_1.expect(vol.toJSON('/', obj)).to.equal(obj);
            });
            it('Export empty volume', function () {
                var vol = volume_1.Volume.fromJSON({});
                chai_1.expect(vol.toJSON()).to.eql({});
            });
            it('Exporting non-existing path', function () {
                var vol = volume_1.Volume.fromJSON({});
                chai_1.expect(vol.toJSON('/lol')).to.eql({});
            });
        });
        describe('.fromJSON(json[, cwd])', function () {
            it('Files at root', function () {
                var vol = new volume_1.Volume;
                var json = {
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                };
                vol.fromJSON(json);
                chai_1.expect(vol.toJSON()).to.eql(json);
            });
            it('Files at root with relative paths', function () {
                var vol = new volume_1.Volume;
                var json = {
                    'hello': 'world',
                    'app.js': 'console.log(123)',
                };
                vol.fromJSON(json, '/');
                chai_1.expect(vol.toJSON()).to.eql({
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                });
            });
            it('Deeply nested tree', function () {
                var vol = new volume_1.Volume;
                var json = {
                    '/dir/file': '...',
                    '/dir/dir/dir2/hello.sh': 'world',
                    '/hello.js': 'console.log(123)',
                    '/dir/dir/test.txt': 'Windows',
                };
                vol.fromJSON(json);
                chai_1.expect(vol.toJSON()).to.eql(json);
            });
            it('Invalid JSON throws error', function () {
                try {
                    var vol = new volume_1.Volume;
                    var json = {
                        '/dir/file': '...',
                        '/dir': 'world',
                    };
                    vol.fromJSON(json);
                    throw Error('This should not throw');
                }
                catch (error) {
                    // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
                    chai_1.expect((error.code === 'EISDIR') || (error.code === 'ENOTDIR')).to.be.true;
                }
            });
            it('Invalid JSON throws error 2', function () {
                try {
                    var vol = new volume_1.Volume;
                    var json = {
                        '/dir': 'world',
                        '/dir/file': '...',
                    };
                    vol.fromJSON(json);
                    throw Error('This should not throw');
                }
                catch (error) {
                    // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
                    chai_1.expect((error.code === 'EISDIR') || (error.code === 'ENOTDIR')).to.be.true;
                }
            });
        });
        describe('.reset()', function () {
            it('Remove all files', function () {
                var vol = new volume_1.Volume;
                var json = {
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                };
                vol.fromJSON(json);
                vol.reset();
                chai_1.expect(vol.toJSON()).to.eql({});
            });
            it('File operations should work after reset', function () {
                var vol = new volume_1.Volume;
                var json = {
                    '/hello': 'world',
                };
                vol.fromJSON(json);
                vol.reset();
                vol.writeFileSync('/good', 'bye');
                chai_1.expect(vol.toJSON()).to.eql({
                    '/good': 'bye',
                });
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
        describe('.readSync(fd, buffer, offset, length, position)', function () {
            it('Basic read file', function () {
                var vol = volume_1.Volume.fromJSON({ '/test.txt': '01234567' });
                var buf = Buffer.alloc(3, 0);
                var bytes = vol.readSync(vol.openSync('/test.txt', 'r'), buf, 0, 3, 3);
                chai_1.expect(bytes).to.equal(3);
                chai_1.expect(buf.equals(Buffer.from('345'))).to.be.true;
            });
            xit('Read more than buffer space');
            xit('Read over file boundary');
            xit('Read multiple times, caret position should adjust');
            xit('Negative tests');
        });
        describe('.read(fd, buffer, offset, length, position, callback)', function () {
            xit('...');
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
                    // Expecting this line to throw
                    vol.readFileSync('/text.txt', 123);
                    throw Error('This should not throw');
                }
                catch (err) {
                    chai_1.expect(err).to.be.an.instanceof(TypeError);
                    // TODO: Check the right error message.
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
        describe('.write(fd, str, position, encoding, callback)', function () {
            xit('...');
        });
        describe('.write(fd, buffer, offset, length, position, callback)', function () {
            it('Simple write to a file descriptor', function (done) {
                var vol = new volume_1.Volume;
                var fd = vol.openSync('/test.txt', 'w+');
                var data = 'hello';
                vol.write(fd, Buffer.from(data), function (err, bytes, buf) {
                    vol.closeSync(fd);
                    chai_1.expect(err).to.equal(null);
                    chai_1.expect(vol.readFileSync('/test.txt', 'utf8')).to.equal(data);
                    done();
                });
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
            describe('Complex, deep, multi-step symlinks get resolved', function () {
                it('Symlink to a folder', function () {
                    var vol = volume_1.Volume.fromJSON({ '/a1/a2/a3/a4/a5/hello.txt': 'world!' });
                    vol.symlinkSync('/a1', '/b1');
                    chai_1.expect(vol.readFileSync('/b1/a2/a3/a4/a5/hello.txt', 'utf8')).to.equal('world!');
                });
                it('Symlink to a folder to a folder', function () {
                    var vol = volume_1.Volume.fromJSON({ '/a1/a2/a3/a4/a5/hello.txt': 'world!' });
                    vol.symlinkSync('/a1', '/b1');
                    vol.symlinkSync('/b1', '/c1');
                    vol.openSync('/c1/a2/a3/a4/a5/hello.txt', 'r');
                });
                it('Multiple hops to folders', function () {
                    var vol = volume_1.Volume.fromJSON({
                        '/a1/a2/a3/a4/a5/hello.txt': 'world a',
                        '/b1/b2/b3/b4/b5/hello.txt': 'world b',
                        '/c1/c2/c3/c4/c5/hello.txt': 'world c',
                    });
                    vol.symlinkSync('/a1/a2', '/b1/l');
                    vol.symlinkSync('/b1/l', '/b1/b2/b3/ok');
                    vol.symlinkSync('/b1/b2/b3/ok', '/c1/a');
                    vol.symlinkSync('/c1/a', '/c1/c2/c3/c4/c5/final');
                    vol.openSync('/c1/c2/c3/c4/c5/final/a3/a4/a5/hello.txt', 'r');
                    chai_1.expect(vol.readFileSync('/c1/c2/c3/c4/c5/final/a3/a4/a5/hello.txt', 'utf8')).to.equal('world a');
                });
            });
        });
        describe('.symlink(target, path[, type], callback)', function () {
            xit('...');
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
        describe('.lstat(path, callback)', function () {
            xit('...');
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
            it('Modification new write', function (done) {
                vol.writeFileSync('/mtime.txt', '1');
                var stats1 = vol.statSync('/mtime.txt');
                setTimeout(function () {
                    vol.writeFileSync('/mtime.txt', '2');
                    var stats2 = vol.statSync('/mtime.txt');
                    chai_1.expect(stats2.mtimeMs).to.be.greaterThan(stats1.mtimeMs);
                    done();
                }, 1);
            });
        });
        describe('.stat(path, callback)', function () {
            xit('...');
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
        describe('.fstat(fd, callback)', function () {
            xit('...');
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
        describe('.link(existingPath, newPath, callback)', function () {
            xit('...');
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
        describe('.readdir(path, callback)', function () {
            xit('...');
        });
        describe('.readlinkSync(path[, options])', function () {
            it('Simple symbolic link to one file', function () {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/1', '123');
                vol.symlinkSync('/1', '/2');
                var res = vol.readlinkSync('/2');
                chai_1.expect(res).to.equal('/1');
            });
        });
        describe('.readlink(path[, options], callback)', function () {
            it('Simple symbolic link to one file', function (done) {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/1', '123');
                vol.symlink('/1', '/2', function (err) {
                    vol.readlink('/2', function (err, res) {
                        chai_1.expect(res).to.equal('/1');
                        done();
                    });
                });
            });
        });
        describe('.fsyncSync(fd)', function () {
            var vol = new volume_1.Volume;
            var fd = vol.openSync('/lol', 'w');
            it('Executes without crashing', function () {
                vol.fsyncSync(fd);
            });
        });
        describe('.fsync(fd, callback)', function () {
            var vol = new volume_1.Volume;
            var fd = vol.openSync('/lol', 'w');
            it('Executes without crashing', function (done) {
                vol.fsync(fd, done);
            });
        });
        describe('.ftruncateSync(fd[, len])', function () {
            var vol = new volume_1.Volume;
            it('Truncates to 0 single file', function () {
                var fd = vol.openSync('/trunky', 'w');
                vol.writeFileSync(fd, '12345');
                chai_1.expect(vol.readFileSync('/trunky', 'utf8')).to.equal('12345');
                vol.ftruncateSync(fd);
                chai_1.expect(vol.readFileSync('/trunky', 'utf8')).to.equal('');
            });
        });
        describe('.ftruncate(fd[, len], callback)', function () {
            xit('...');
        });
        describe('.truncateSync(path[, len])', function () {
            var vol = new volume_1.Volume;
            it('Truncates to 0 single file', function () {
                var fd = vol.openSync('/trunky', 'w');
                vol.writeFileSync(fd, '12345');
                chai_1.expect(vol.readFileSync('/trunky', 'utf8')).to.equal('12345');
                vol.truncateSync('/trunky');
                chai_1.expect(vol.readFileSync('/trunky', 'utf8')).to.equal('');
            });
            it('Partial truncate', function () {
                var fd = vol.openSync('/1', 'w');
                vol.writeFileSync(fd, '12345');
                chai_1.expect(vol.readFileSync('/1', 'utf8')).to.equal('12345');
                vol.truncateSync('/1', 2);
                chai_1.expect(vol.readFileSync('/1', 'utf8')).to.equal('12');
            });
        });
        describe('.truncate(path[, len], callback)', function () {
            xit('...');
        });
        describe('.utimesSync(path, atime, mtime)', function () {
            var vol = new volume_1.Volume;
            it('Set times on file', function () {
                vol.writeFileSync('/lol', '12345');
                vol.utimesSync('/lol', 1234, 12345);
                var stats = vol.statSync('/lol');
                chai_1.expect(Math.round(stats.atime.getTime() / 1000)).to.equal(1234);
                chai_1.expect(Math.round(stats.mtime.getTime() / 1000)).to.equal(12345);
            });
        });
        describe('.utimes(path, atime, mtime, callback)', function () {
            xit('...', function () { });
        });
        describe('.mkdirSync(path[, mode])', function () {
            it('Create dir at root', function () {
                var vol = new volume_1.Volume;
                vol.mkdirSync('/test');
                var child = vol.root.getChild('test');
                chai_1.expect(child).to.be.an.instanceof(node_1.Link);
                chai_1.expect(child.getNode().isDirectory()).to.be.true;
            });
            it('Create 2 levels deep folders', function () {
                var vol = new volume_1.Volume;
                vol.mkdirSync('/dir1');
                vol.mkdirSync('/dir1/dir2');
                var dir1 = vol.root.getChild('dir1');
                chai_1.expect(dir1).to.be.an.instanceof(node_1.Link);
                chai_1.expect(dir1.getNode().isDirectory()).to.be.true;
                var dir2 = dir1.getChild('dir2');
                chai_1.expect(dir2).to.be.an.instanceof(node_1.Link);
                chai_1.expect(dir2.getNode().isDirectory()).to.be.true;
                chai_1.expect(dir2.getPath()).to.equal('/dir1/dir2');
            });
        });
        describe('.mkdir(path[, mode], callback)', function () {
            xit('...');
        });
        describe('.mkdtempSync(prefix[, options])', function () {
            it('Create temp dir at root', function () {
                var vol = new volume_1.Volume;
                var name = vol.mkdtempSync('/tmp-');
                vol.writeFileSync(name + '/file.txt', 'lol');
                chai_1.expect(vol.toJSON()).to.eql((_a = {}, _a[name + '/file.txt'] = 'lol', _a));
                var _a;
            });
        });
        describe('.mkdtemp(prefix[, options], callback)', function () {
            xit('Create temp dir at root', function () { });
        });
        describe('.mkdirpSync(path[, mode])', function () {
            it('Create /dir1/dir2/dir3', function () {
                var vol = new volume_1.Volume;
                vol.mkdirpSync('/dir1/dir2/dir3');
                var dir1 = vol.root.getChild('dir1');
                var dir2 = dir1.getChild('dir2');
                var dir3 = dir2.getChild('dir3');
                chai_1.expect(dir1).to.be.an.instanceof(node_1.Link);
                chai_1.expect(dir2).to.be.an.instanceof(node_1.Link);
                chai_1.expect(dir3).to.be.an.instanceof(node_1.Link);
                chai_1.expect(dir1.getNode().isDirectory()).to.be.true;
                chai_1.expect(dir2.getNode().isDirectory()).to.be.true;
                chai_1.expect(dir3.getNode().isDirectory()).to.be.true;
            });
        });
        describe('.mkdirp(path[, mode], callback)', function () {
            xit('Create /dir1/dir2/dir3', function () { });
        });
        describe('.rmdirSync(path)', function () {
            it('Remove single dir', function () {
                var vol = new volume_1.Volume;
                vol.mkdirSync('/dir');
                chai_1.expect(vol.root.getChild('dir').getNode().isDirectory()).to.be.true;
                vol.rmdirSync('/dir');
                chai_1.expect(!!vol.root.getChild('dir')).to.be.false;
            });
        });
        describe('.rmdir(path, callback)', function () {
            xit('Remove single dir', function () { });
        });
        describe('.watchFile(path[, options], listener)', function () {
            it('Calls listener on .writeFile', function (done) {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/lol.txt', '1');
                setTimeout(function () {
                    vol.watchFile('/lol.txt', { interval: 1 }, function (curr, prev) {
                        vol.unwatchFile('/lol.txt');
                        done();
                    });
                    vol.writeFileSync('/lol.txt', '2');
                }, 1);
            });
            xit('Multiple listeners for one file', function () { });
        });
        describe('.unwatchFile(path[, listener])', function () {
            it('Stops watching before .writeFile', function (done) {
                var vol = new volume_1.Volume;
                vol.writeFileSync('/lol.txt', '1');
                setTimeout(function () {
                    var listenerCalled = false;
                    vol.watchFile('/lol.txt', { interval: 1 }, function (curr, prev) {
                        listenerCalled = true;
                    });
                    vol.unwatchFile('/lol.txt');
                    vol.writeFileSync('/lol.txt', '2');
                    setTimeout(function () {
                        chai_1.expect(listenerCalled).to.be.false;
                        done();
                    }, 10);
                }, 1);
            });
        });
    });
    describe('StatWatcher', function () {
        it('.vol points to current volume', function () {
            var vol = new volume_1.Volume;
            chai_1.expect((new volume_1.StatWatcher(vol)).vol).to.equal(vol);
        });
    });
});
