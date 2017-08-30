import {Link, Node, Stats} from "./node";
import {Volume, filenameToSteps, StatWatcher} from "./volume";
import {expect} from 'chai';
import {resolve, join} from 'path';
import * as fs from 'fs';


const MOCK_DIR = join(__dirname, '../test/mock');


describe('volume', () => {
    describe('filenameToSteps(filename): string[]', () => {
        it('/ -> []', () => {
            expect(filenameToSteps('/')).to.eql([]);
        });
        it('/test -> ["test"]', () => {
            expect(filenameToSteps('/test')).to.eql(['test']);
        });
        it('/usr/bin/node.sh -> ["usr", "bin", "node.sh"]', () => {
            expect(filenameToSteps('/usr/bin/node.sh')).to.eql(['usr', 'bin', 'node.sh']);
        });
        it('/dir/file.txt -> ["dir", "file.txt"]', () => {
            expect(filenameToSteps('/dir/file.txt')).to.eql(['dir', 'file.txt']);
        });
        it('/dir/./file.txt -> ["dir", "file.txt"]', () => {
            expect(filenameToSteps('/dir/./file.txt')).to.eql(['dir', 'file.txt']);
        });
        it('/dir/../file.txt -> ["file.txt"]', () => {
            expect(filenameToSteps('/dir/../file.txt')).to.eql(['file.txt']);
        });
    });
    describe('Volume', () => {
        it('.genRndStr()', () => {
            const vol = new Volume;
            for(let i = 0; i < 100; i++) {
                const str = vol.genRndStr();
                expect(typeof str === 'string').to.be.true;
                expect(str.length).to.equal(6);
            }
        });
        describe('.getLink(steps)', () => {
            const vol = new Volume;
            it('[] - Get the root link', () => {
                const link = vol.getLink([]);
                expect(link).to.be.an.instanceof(Link);
                expect(link).to.equal(vol.root);
            });
            it('["child.sh"] - Get a child link', () => {
                const link1 = vol.root.createChild('child.sh');
                const link2 = vol.getLink(['child.sh']);
                expect(link1).to.equal(link2);
            });
            it('["dir", "child.sh"] - Get a child link in a dir', () => {
                const dir = vol.root.createChild('dir');
                const link1 = dir.createChild('child.sh');
                const node2 = vol.getLink(['dir', 'child.sh']);
                expect(link1).to.equal(node2);
            });
        });
        describe('.toJSON()', () => {
            it('Single file', () => {
                const vol = new Volume;
                vol.writeFileSync('/test', 'Hello');
                expect(vol.toJSON()).to.eql({'/test': 'Hello'})
            });
            it('Multiple files', () => {
                const vol = new Volume;
                vol.writeFileSync('/test', 'Hello');
                vol.writeFileSync('/test2', 'Hello2');
                vol.writeFileSync('/test.txt', 'Hello3');
                expect(vol.toJSON()).to.eql({
                    '/test': 'Hello',
                    '/test2': 'Hello2',
                    '/test.txt': 'Hello3',
                })
            });
            it('With folders, skips empty folders', () => {
                const vol = new Volume;
                vol.writeFileSync('/test', 'Hello');
                vol.mkdirSync('/dir');
                vol.mkdirSync('/dir/dir2');

                // Folder `/dir3` will be empty, and should not be in the JSON aoutput.
                vol.mkdirSync('/dir3');

                vol.writeFileSync('/dir/abc', 'abc');
                vol.writeFileSync('/dir/abc2', 'abc2');
                vol.writeFileSync('/dir/dir2/hello.txt', 'world');
                expect(vol.toJSON()).to.eql({
                    '/test': 'Hello',
                    '/dir/abc': 'abc',
                    '/dir/abc2': 'abc2',
                    '/dir/dir2/hello.txt': 'world',
                })
            });
            it('Specify export path', () => {
                const vol = Volume.fromJSON({
                    '/foo': 'bar',
                    '/dir/a': 'b',
                });
                expect(vol.toJSON('/dir')).to.eql({
                    '/dir/a': 'b',
                })
            });
            it('Specify multiple export paths', () => {
                const vol = Volume.fromJSON({
                    '/foo': 'bar',
                    '/dir/a': 'b',
                    '/dir2/a': 'b',
                    '/dir2/c': 'd',
                });
                expect(vol.toJSON(['/dir2', '/dir'])).to.eql({
                    '/dir/a': 'b',
                    '/dir2/a': 'b',
                    '/dir2/c': 'd',
                })
            });
            it('Accumulate exports on supplied object', () => {
                const vol = Volume.fromJSON({
                    '/foo': 'bar',
                });
                const obj = {};
                expect(vol.toJSON('/', obj)).to.equal(obj);
            });
            it('Export empty volume', () => {
                const vol = Volume.fromJSON({});
                expect(vol.toJSON()).to.eql({});
            });
            it('Exporting non-existing path', () => {
                const vol = Volume.fromJSON({});
                expect(vol.toJSON('/lol')).to.eql({});
            });
        });
        describe('.fromJSON(json[, cwd])', () => {
            it('Files at root', () => {
                const vol = new Volume;
                const json = {
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                };
                vol.fromJSON(json);
                expect(vol.toJSON()).to.eql(json);
            });
            it('Files at root with relative paths', () => {
                const vol = new Volume;
                const json = {
                    'hello': 'world',
                    'app.js': 'console.log(123)',
                };
                vol.fromJSON(json, '/');
                expect(vol.toJSON()).to.eql({
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                });
            });
            it('Deeply nested tree', () => {
                const vol = new Volume;
                const json = {
                    '/dir/file': '...',
                    '/dir/dir/dir2/hello.sh': 'world',
                    '/hello.js': 'console.log(123)',
                    '/dir/dir/test.txt': 'Windows',
                };
                vol.fromJSON(json);
                expect(vol.toJSON()).to.eql(json);
            });
            it('Invalid JSON throws error', () => {
                try {
                    const vol = new Volume;
                    const json = {
                        '/dir/file': '...',
                        '/dir': 'world',
                    };
                    vol.fromJSON(json);
                    throw Error('This should not throw');
                } catch(error) {
                    // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
                    expect((error.code === 'EISDIR') || (error.code === 'ENOTDIR')).to.be.true;
                }
            });
            it('Invalid JSON throws error 2', () => {
                try {
                    const vol = new Volume;
                    const json = {
                        '/dir': 'world',
                        '/dir/file': '...',
                    };
                    vol.fromJSON(json);
                    throw Error('This should not throw');
                } catch(error) {
                    // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
                    expect((error.code === 'EISDIR') || (error.code === 'ENOTDIR')).to.be.true;
                }
            });
        });
        describe('.reset()', () => {
            it('Remove all files', () => {
                const vol = new Volume;
                const json = {
                    '/hello': 'world',
                    '/app.js': 'console.log(123)',
                };
                vol.fromJSON(json);
                vol.reset();
                expect(vol.toJSON()).to.eql({});
            });
            it('File operations should work after reset', () => {
                const vol = new Volume;
                const json = {
                    '/hello': 'world',
                };
                vol.fromJSON(json);
                vol.reset();
                vol.writeFileSync('/good', 'bye');
                expect(vol.toJSON()).to.eql({
                    '/good': 'bye',
                });
            });
        });
        describe('.openSync(path, flags[, mode])', () => {
            const vol = new Volume;
            it('Create new file at root (/test.txt)', () => {
                const fd = vol.openSync('/test.txt', 'w');
                expect(vol.root.getChild('test.txt')).to.be.an.instanceof(Link);
                expect(typeof fd).to.equal('number');
                expect(fd).to.be.greaterThan(0);
            });
            it('Error on file not found', () => {
                try {
                    vol.openSync('/non-existing-file.txt', 'r');
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err.code).to.equal('ENOENT');
                }
            });
            it('Invalid path correct error code', () => {
                try {
                    (vol as any).openSync(123, 'r');
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err).to.be.an.instanceof(TypeError);
                    expect(err.message).to.equal('path must be a string or Buffer');
                }
            });
            it('Invalid flags correct error code', () => {
                try {
                    (vol as any).openSync('/non-existing-file.txt');
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err.code).to.equal('ERR_INVALID_OPT_VALUE');
                }
            });
            it('Invalid mode correct error code', () => {
                try {
                    vol.openSync('/non-existing-file.txt', 'r', 'adfasdf');
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err).to.be.an.instanceof(TypeError);
                    expect(err.message).to.equal('mode must be an int');
                }
            });
            it('Open multiple files', () => {
                const fd1 = vol.openSync('/1.json', 'w');
                const fd2 = vol.openSync('/2.json', 'w');
                const fd3 = vol.openSync('/3.json', 'w');
                const fd4 = vol.openSync('/4.json', 'w');
                expect(typeof fd1).to.equal('number');
                expect(fd1 !== fd2).to.be.true;
                expect(fd2 !== fd3).to.be.true;
                expect(fd3 !== fd4).to.be.true;
            });
        });
        describe('.open(path, flags[, mode], callback)', () => {
            const vol = new Volume;
            it('Create new file at root (/test.txt)', done => {
                vol.open('/test.txt', 'w', (err, fd) => {
                    expect(err).to.equal(null);
                    expect(vol.root.getChild('test.txt')).to.be.an.instanceof(Link);
                    expect(typeof fd).to.equal('number');
                    expect(fd).to.be.greaterThan(0);
                    done();
                });
            });
            it('Error on file not found', done => {
                vol.open('/non-existing-file.txt', 'r', (err, fd) => {
                    expect(err.code).to.equal('ENOENT');
                    done();
                });
            });
            it('Invalid path correct error code thrown synchronously', done => {
                try {
                    (vol as any).open(123, 'r', (err, fd) => {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err).to.be.an.instanceof(TypeError);
                    expect(err.message).to.equal('path must be a string or Buffer');
                    done();
                }
            });
            it('Invalid flags correct error code thrown synchronously', done => {
                try {
                    (vol as any).open('/non-existing-file.txt', undefined, () => {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err.code).to.equal('ERR_INVALID_OPT_VALUE');
                    done();
                }
            });
            it('Invalid mode correct error code thrown synchronously', done => {
                try {
                    (vol as any).openSync('/non-existing-file.txt', 'r', 'adfasdf', () => {
                        throw Error('This should not throw');
                    });
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err).to.be.an.instanceof(TypeError);
                    expect(err.message).to.equal('mode must be an int');
                    done();
                }
            });
        });
        describe('.close(fd, callback)', () => {
            const vol = new Volume;
            it('Closes file without errors', done => {
                vol.open('/test.txt', 'w', (err, fd) => {
                    expect(err).to.equal(null);
                    vol.close(fd, err => {
                        expect(err).to.equal(null);
                        done();
                    });
                });
            });
        });
        describe('.readSync(fd, buffer, offset, length, position)', () => {
            it('Basic read file', () => {
                const vol = Volume.fromJSON({'/test.txt': '01234567'});
                const buf = Buffer.alloc(3, 0);
                const bytes = vol.readSync(vol.openSync('/test.txt', 'r'), buf, 0, 3, 3);
                expect(bytes).to.equal(3);
                expect(buf.equals(Buffer.from('345'))).to.be.true;

            });
            xit('Read more than buffer space');
            xit('Read over file boundary');
            xit('Read multiple times, caret position should adjust');
            xit('Negative tests');
        });
        describe('.read(fd, buffer, offset, length, position, callback)', () => {
            xit('...');
        });
        describe('.readFileSync(path[, options])', () => {
            const vol = new Volume;
            const data = 'trololo';
            const fileNode = (vol as any).createLink(vol.root, 'text.txt').getNode();
            fileNode.setString(data);
            it('Read file at root (/text.txt)', () => {
                const buf = vol.readFileSync('/text.txt');
                const str = buf.toString();
                expect(buf).to.be.instanceof(Buffer);
                expect(str).to.equal(data);
            });
            it('Specify encoding as string', () => {
                const str = vol.readFileSync('/text.txt', 'utf8');
                expect(str).to.equal(data);
            });
            it('Specify encoding in object', () => {
                const str = vol.readFileSync('/text.txt', {encoding: 'utf8'});
                expect(str).to.equal(data);
            });
            it('Read file deep in tree (/dir1/dir2/test-file)', () => {
                const dir1 = (vol as any).createLink(vol.root, 'dir1', true);
                const dir2 = (vol as any).createLink(dir1, 'dir2', true);
                const fileNode = (vol as any).createLink(dir2, 'test-file').getNode();
                const data = 'aaaaaa';
                fileNode.setString(data);

                const str = vol.readFileSync('/dir1/dir2/test-file').toString();
                expect(str).to.equal(data);
            });
            it('Invalid options should throw', () => {
                try {
                    // Expecting this line to throw
                    vol.readFileSync('/text.txt', 123 as any);
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err).to.be.an.instanceof(TypeError);
                    // TODO: Check the right error message.
                }
            });
        });
        describe('.readFile(path[, options], callback)', () => {
            const vol = new Volume;
            const data = 'asdfasdf asdfasdf asdf';
            const fileNode = (vol as any).createLink(vol.root, 'file.txt').getNode();
            fileNode.setString(data);
            it('Read file at root (/file.txt)', done => {
                vol.readFile('/file.txt', 'utf8', (err, str) => {
                    expect(err).to.equal(null);
                    expect(str).to.equal(data);
                    done();
                });
            });
        });
        describe('.writeSync(fd, str, position, encoding)', () => {
            const vol = new Volume;
            it('Simple write to a file descriptor', () => {
                const fd = vol.openSync('/test.txt', 'w+');
                const data = 'hello';
                const bytes = vol.writeSync(fd, data);
                vol.closeSync(fd);
                expect(bytes).to.equal(data.length);
                expect(vol.readFileSync('/test.txt', 'utf8')).to.equal(data);
            });
            it('Multiple writes to a file', () => {
                const fd = vol.openSync('/multi.txt', 'w+');
                const datas = ['hello', ' ', 'world', '!'];
                let bytes = 0;
                for(let data of datas) {
                    let b = vol.writeSync(fd, data);
                    expect(b).to.equal(data.length);
                    bytes += b;
                }
                vol.closeSync(fd);
                const result = datas.join('');
                expect(bytes).to.equal(result.length);
                expect(vol.readFileSync('/multi.txt', 'utf8')).to.equal(result);
            });
            it('Overwrite part of file', () => {
                const fd = vol.openSync('/overwrite.txt', 'w+');
                vol.writeSync(fd, 'martini');
                vol.writeSync(fd, 'Armagedon', 1, 'utf8');
                vol.closeSync(fd);
                expect(vol.readFileSync('/overwrite.txt', 'utf8')).to.equal('mArmagedon');
            });
        });
        describe('.writeSync(fd, buffer, offset, length, position)', () => {
            const vol = new Volume;
            it('Write binary data to file', () => {
                const fd = vol.openSync('/data.bin', 'w+');
                const bytes = vol.writeSync(fd, Buffer.from([1,2,3]));
                vol.closeSync(fd);
                expect(bytes).to.equal(3);
                expect(Buffer.from([1,2,3]).equals(vol.readFileSync('/data.bin') as Buffer)).to.be.true;
            });
        });
        describe('.write(fd, str, position, encoding, callback)', () => {
            xit('...');
        });
        describe('.write(fd, buffer, offset, length, position, callback)', () => {
            it('Simple write to a file descriptor', done => {
                const vol = new Volume;
                const fd = vol.openSync('/test.txt', 'w+');
                const data = 'hello';
                vol.write(fd, Buffer.from(data), (err, bytes, buf) => {
                    vol.closeSync(fd);
                    expect(err).to.equal(null);
                    expect(vol.readFileSync('/test.txt', 'utf8')).to.equal(data);
                    done();
                });
            });
        });
        describe('.writeFile(path, data[, options], callback)', () => {
            const vol = new Volume;
            const data = 'asdfasidofjasdf';
            it('Create a file at root (/writeFile.json)', done => {
                vol.writeFile('/writeFile.json', data, err => {
                    expect(err).to.equal(null);
                    const str = vol.root.getChild('writeFile.json').getNode().getString();
                    expect(str).to.equal(data);
                    done();
                });
            });
            it('Throws error when no callback provided', () => {
                try {
                    vol.writeFile('/asdf.txt', 'asdf', 'utf8', undefined);
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err.message).to.equal('callback must be a function');
                }
            });
        });
        describe('.symlinkSync(target, path[, type])', () => {
            const vol = new Volume;
            const jquery = (vol as any).createLink(vol.root, 'jquery.js').getNode();
            const data = '"use strict";';
            jquery.setString(data);
            it('Create a symlink', () => {
                vol.symlinkSync('/jquery.js', '/test.js');
                expect(vol.root.getChild('test.js')).to.be.an.instanceof(Link);
                expect(vol.root.getChild('test.js').getNode().isSymlink()).to.equal(true);
            });
            it('Read from symlink', () => {
                vol.symlinkSync('/jquery.js', '/test2.js');
                expect(vol.readFileSync('/test2.js').toString()).to.equal(data);
            });
            describe('Complex, deep, multi-step symlinks get resolved', () => {
                it('Symlink to a folder', () => {
                    const vol = Volume.fromJSON({'/a1/a2/a3/a4/a5/hello.txt': 'world!'});
                    vol.symlinkSync('/a1', '/b1');
                    expect(vol.readFileSync('/b1/a2/a3/a4/a5/hello.txt', 'utf8')).to.equal('world!');
                });
                it('Symlink to a folder to a folder', () => {
                    const vol = Volume.fromJSON({'/a1/a2/a3/a4/a5/hello.txt': 'world!'});
                    vol.symlinkSync('/a1', '/b1');
                    vol.symlinkSync('/b1', '/c1');
                    vol.openSync('/c1/a2/a3/a4/a5/hello.txt', 'r');
                });
                it('Multiple hops to folders', () => {
                    const vol = Volume.fromJSON({
                        '/a1/a2/a3/a4/a5/hello.txt': 'world a',
                        '/b1/b2/b3/b4/b5/hello.txt': 'world b',
                        '/c1/c2/c3/c4/c5/hello.txt': 'world c',
                    });
                    vol.symlinkSync('/a1/a2', '/b1/l');
                    vol.symlinkSync('/b1/l', '/b1/b2/b3/ok');
                    vol.symlinkSync('/b1/b2/b3/ok', '/c1/a');
                    vol.symlinkSync('/c1/a', '/c1/c2/c3/c4/c5/final');
                    vol.openSync('/c1/c2/c3/c4/c5/final/a3/a4/a5/hello.txt', 'r');
                    expect(vol.readFileSync('/c1/c2/c3/c4/c5/final/a3/a4/a5/hello.txt', 'utf8')).to.equal('world a');
                });
            });
        });
        describe('.symlink(target, path[, type], callback)', () => {
            xit('...');
        });
        describe('.realpathSync(path[, options])', () => {
            const vol = new Volume;
            const mootools = vol.root.createChild('mootools.js');
            const data = 'String.prototype...';
            mootools.getNode().setString(data);

            const symlink = vol.root.createChild('mootools.link.js');
            symlink.getNode().makeSymlink(['mootools.js']);

            it('Symlink works', () => {
                const resolved = vol.resolveSymlinks(symlink);
                expect(resolved).to.equal(mootools);
            });
            it('Basic one-jump symlink resolves', () => {
                const path = vol.realpathSync('/mootools.link.js');
                expect(path).to.equal('/mootools.js');
            });
            it('Basic one-jump symlink with /./ and /../ in path', () => {
                const path = vol.realpathSync('/./lol/../mootools.link.js');
                expect(path).to.equal('/mootools.js');
            });
        });
        describe('.realpath(path[, options], callback)', () => {
            const vol = new Volume;
            const mootools = vol.root.createChild('mootools.js');
            const data = 'String.prototype...';
            mootools.getNode().setString(data);

            const symlink = vol.root.createChild('mootools.link.js');
            symlink.getNode().makeSymlink(['mootools.js']);

            it('Basic one-jump symlink resolves', done => {
                vol.realpath('/mootools.link.js', (err, path) => {
                    expect(path).to.equal('/mootools.js');
                    done();
                });
            });
            it('Basic one-jump symlink with /./ and /../ in path', () => {
                vol.realpath('/./lol/../mootools.link.js', (err, path) => {
                    expect(path).to.equal('/mootools.js');
                });
            });
        });
        describe('.lstatSync(path)', () => {
            const vol = new Volume;
            const dojo = vol.root.createChild('dojo.js');
            const data = '(funciton(){})();';
            dojo.getNode().setString(data);

            it('Returns basic file stats', () => {
                const stats = vol.lstatSync('/dojo.js');
                expect(stats).to.be.an.instanceof(Stats);
                expect(stats.size).to.equal(data.length);
                expect(stats.isFile()).to.be.true;
                expect(stats.isDirectory()).to.be.false;
            });
            it('Stats on symlink returns results about the symlink', () => {
                vol.symlinkSync('/dojo.js', '/link.js');
                const stats = vol.lstatSync('/link.js');
                expect(stats.isSymbolicLink()).to.be.true;
                expect(stats.isFile()).to.be.false;
                expect(stats.size).to.equal(0);
            });
        });
        describe('.lstat(path, callback)', () => {
            xit('...');
        });
        describe('.statSync(path)', () => {
            const vol = new Volume;
            const dojo = vol.root.createChild('dojo.js');
            const data = '(funciton(){})();';
            dojo.getNode().setString(data);
            it('Returns basic file stats', () => {
                const stats = vol.statSync('/dojo.js');
                expect(stats).to.be.an.instanceof(Stats);
                expect(stats.size).to.equal(data.length);
                expect(stats.isFile()).to.be.true;
                expect(stats.isDirectory()).to.be.false;
            });
            it('Stats on symlink returns results about the resolved file', () => {
                vol.symlinkSync('/dojo.js', '/link.js');
                const stats = vol.statSync('/link.js');
                expect(stats.isSymbolicLink()).to.be.false;
                expect(stats.isFile()).to.be.true;
                expect(stats.size).to.equal(data.length);
            });
            it('Modification new write', done => {
                vol.writeFileSync('/mtime.txt', '1');
                const stats1 = vol.statSync('/mtime.txt');
                setTimeout(() => {
                    vol.writeFileSync('/mtime.txt', '2');
                    const stats2 = vol.statSync('/mtime.txt');
                    expect(stats2.mtimeMs).to.be.greaterThan(stats1.mtimeMs);
                    done();
                }, 1);
            });
        });
        describe('.stat(path, callback)', () => {
            xit('...');
        });
        describe('.fstatSync(fd)', () => {
            const vol = new Volume;
            const dojo = vol.root.createChild('dojo.js');
            const data = '(funciton(){})();';
            dojo.getNode().setString(data);

            it('Returns basic file stats', () => {
                const fd = vol.openSync('/dojo.js', 'r');
                const stats = vol.fstatSync(fd);
                expect(stats).to.be.an.instanceof(Stats);
                expect(stats.size).to.equal(data.length);
                expect(stats.isFile()).to.be.true;
                expect(stats.isDirectory()).to.be.false;
            });
        });
        describe('.fstat(fd, callback)', () => {
            xit('...');
        });
        describe('.linkSync(existingPath, newPath)', () => {
            const vol = new Volume;
            it('Create a new link', () => {
                const data = '123';
                vol.writeFileSync('/1.txt', data);
                vol.linkSync('/1.txt', '/2.txt');
                expect(vol.readFileSync('/1.txt', 'utf8')).to.equal(data);
                expect(vol.readFileSync('/2.txt', 'utf8')).to.equal(data);
            });
            it('nlink property of i-node increases when new link is created', () => {
                vol.writeFileSync('/a.txt', '123');
                vol.linkSync('/a.txt', '/b.txt');
                vol.linkSync('/a.txt', '/c.txt');
                const stats = vol.statSync('/b.txt');
                expect(stats.nlink).to.equal(3);
            });
        });
        describe('.link(existingPath, newPath, callback)', () => {
            xit('...');
        });
        describe('.readdirSync(path)', () => {
            const vol = new Volume;
            it('Returns simple list', () => {
                vol.writeFileSync('/1.js', '123');
                vol.writeFileSync('/2.js', '123');
                const list = vol.readdirSync('/');
                expect(list.length).to.equal(2);
                expect(list).to.eql(['1.js', '2.js']);
            });
        });
        describe('.readdir(path, callback)', () => {
            xit('...');
        });
        describe('.readlinkSync(path[, options])', () => {
            it('Simple symbolic link to one file', () => {
                const vol = new Volume;
                vol.writeFileSync('/1', '123');
                vol.symlinkSync('/1', '/2');
                const res = vol.readlinkSync('/2');
                expect(res).to.equal('/1');
            });
        });
        describe('.readlink(path[, options], callback)', () => {
            it('Simple symbolic link to one file', done => {
                const vol = new Volume;
                vol.writeFileSync('/1', '123');
                vol.symlink('/1', '/2', err => {
                    vol.readlink('/2', (err, res) => {
                        expect(res).to.equal('/1');
                        done();
                    });
                });
            });
        });
        describe('.fsyncSync(fd)', () => {
            const vol = new Volume;
            const fd = vol.openSync('/lol', 'w');
            it('Executes without crashing', () => {
                vol.fsyncSync(fd);
            });
        });
        describe('.fsync(fd, callback)', () => {
            const vol = new Volume;
            const fd = vol.openSync('/lol', 'w');
            it('Executes without crashing', done => {
                vol.fsync(fd, done);
            });
        });
        describe('.ftruncateSync(fd[, len])', () => {
            const vol = new Volume;
            it('Truncates to 0 single file', () => {
                const fd = vol.openSync('/trunky', 'w');
                vol.writeFileSync(fd, '12345');
                expect(vol.readFileSync('/trunky', 'utf8')).to.equal('12345');
                vol.ftruncateSync(fd);
                expect(vol.readFileSync('/trunky', 'utf8')).to.equal('');
            });
        });
        describe('.ftruncate(fd[, len], callback)', () => {
            xit('...');
        });
        describe('.truncateSync(path[, len])', () => {
            const vol = new Volume;
            it('Truncates to 0 single file', () => {
                const fd = vol.openSync('/trunky', 'w');
                vol.writeFileSync(fd, '12345');
                expect(vol.readFileSync('/trunky', 'utf8')).to.equal('12345');
                vol.truncateSync('/trunky');
                expect(vol.readFileSync('/trunky', 'utf8')).to.equal('');
            });
            it('Partial truncate', () => {
                const fd = vol.openSync('/1', 'w');
                vol.writeFileSync(fd, '12345');
                expect(vol.readFileSync('/1', 'utf8')).to.equal('12345');
                vol.truncateSync('/1', 2);
                expect(vol.readFileSync('/1', 'utf8')).to.equal('12');
            });
        });
        describe('.truncate(path[, len], callback)', () => {
            xit('...');
        });
        describe('.utimesSync(path, atime, mtime)', () => {
            const vol = new Volume;
            it('Set times on file', () => {
                vol.writeFileSync('/lol', '12345');
                vol.utimesSync('/lol', 1234, 12345);
                const stats = vol.statSync('/lol');
                expect(Math.round(stats.atime.getTime() / 1000)).to.equal(1234);
                expect(Math.round(stats.mtime.getTime() / 1000)).to.equal(12345);
            });
        });
        describe('.utimes(path, atime, mtime, callback)', () => {
            xit('...', () => {});
        });
        describe('.mkdirSync(path[, mode])', () => {
            it('Create dir at root', () => {
                const vol = new Volume;
                vol.mkdirSync('/test');
                const child = vol.root.getChild('test');
                expect(child).to.be.an.instanceof(Link);
                expect(child.getNode().isDirectory()).to.be.true;
            });
            it('Create 2 levels deep folders', () => {
                const vol = new Volume;
                vol.mkdirSync('/dir1');
                vol.mkdirSync('/dir1/dir2');
                const dir1 = vol.root.getChild('dir1');
                expect(dir1).to.be.an.instanceof(Link);
                expect(dir1.getNode().isDirectory()).to.be.true;
                const dir2 = dir1.getChild('dir2');
                expect(dir2).to.be.an.instanceof(Link);
                expect(dir2.getNode().isDirectory()).to.be.true;
                expect(dir2.getPath()).to.equal('/dir1/dir2');
            });
        });
        describe('.mkdir(path[, mode], callback)', () => {
            xit('...');
        });
        describe('.mkdtempSync(prefix[, options])', () => {
            it('Create temp dir at root', () => {
                const vol = new Volume;
                const name = vol.mkdtempSync('/tmp-');
                vol.writeFileSync(name + '/file.txt', 'lol');
                expect(vol.toJSON()).to.eql({[name + '/file.txt']: 'lol'});
            });
        });
        describe('.mkdtemp(prefix[, options], callback)', () => {
            xit('Create temp dir at root', () => {});
        });
        describe('.mkdirpSync(path[, mode])', () => {
            it('Create /dir1/dir2/dir3', () => {
                const vol = new Volume;
                vol.mkdirpSync('/dir1/dir2/dir3');
                const dir1 = vol.root.getChild('dir1');
                const dir2 = dir1.getChild('dir2');
                const dir3 = dir2.getChild('dir3');
                expect(dir1).to.be.an.instanceof(Link);
                expect(dir2).to.be.an.instanceof(Link);
                expect(dir3).to.be.an.instanceof(Link);
                expect(dir1.getNode().isDirectory()).to.be.true;
                expect(dir2.getNode().isDirectory()).to.be.true;
                expect(dir3.getNode().isDirectory()).to.be.true;
            });
        });
        describe('.mkdirp(path[, mode], callback)', () => {
            xit('Create /dir1/dir2/dir3', () => {});
        });
        describe('.rmdirSync(path)', () => {
            it('Remove single dir', () => {
                const vol = new Volume;
                vol.mkdirSync('/dir');
                expect(vol.root.getChild('dir').getNode().isDirectory()).to.be.true;
                vol.rmdirSync('/dir');
                expect(!!vol.root.getChild('dir')).to.be.false;
            });
        });
        describe('.rmdir(path, callback)', () => {
            xit('Remove single dir', () => {});
        });
        describe('.watchFile(path[, options], listener)', () => {
            it('Calls listener on .writeFile', done => {
                const vol = new Volume;
                vol.writeFileSync('/lol.txt', '1');
                setTimeout(() => {
                    vol.watchFile('/lol.txt', {interval: 1}, (curr, prev) => {
                        vol.unwatchFile('/lol.txt');
                        done();
                    });
                    vol.writeFileSync('/lol.txt', '2');
                }, 1);
            });
            xit('Multiple listeners for one file', () => {});
        });
        describe('.unwatchFile(path[, listener])', () => {
            it('Stops watching before .writeFile', done => {
                const vol = new Volume;
                vol.writeFileSync('/lol.txt', '1');
                setTimeout(() => {
                    let listenerCalled = false;
                    vol.watchFile('/lol.txt', {interval: 1}, (curr, prev) => {
                        listenerCalled = true;
                    });
                    vol.unwatchFile('/lol.txt');
                    vol.writeFileSync('/lol.txt', '2');
                    setTimeout(() => {
                        expect(listenerCalled).to.be.false;
                        done();
                    }, 10);
                }, 1);
            });
        });
    });
    describe('StatWatcher', () => {
        it('.vol points to current volume', () => {
            const vol = new Volume;
            expect((new StatWatcher(vol)).vol).to.equal(vol);
        });
    });
});