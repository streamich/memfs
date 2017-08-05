import {Link, Node, Stats} from "./node";
import {Volume, filenameToSteps} from "./volume";
import {expect} from 'chai';
import {resolve, join} from 'path';
import * as fs from 'fs';


const MOCK_DIR = join(__dirname, '../test/mock');


describe('volume', () => {
    describe('filenameToSteps(filename): string[]', () => {
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
        describe('.closeSync(fd)', () => {
            const vol = new Volume;
            it('Closes file without errors', () => {
                const fd = vol.openSync('/test.txt', 'w');
                vol.closeSync(fd);
            });
            it('Closing same file descriptor twice throws EBADF', () => {
                const fd = vol.openSync('/test.txt', 'w');
                vol.closeSync(fd);
                try {
                    vol.closeSync(fd);
                    throw Error('This should not throw');
                } catch(err) {
                    expect(err.code).to.equal('EBADF');
                }
            });
            it('Closing a file decreases the number of open files', () => {
                const fd = vol.openSync('/test.txt', 'w');
                const openFiles = vol.openFiles;
                vol.closeSync(fd);
                expect(openFiles).to.be.greaterThan(vol.openFiles);
            });
            it('When closing a file, its descriptor is added to the pool of descriptors to be reused', () => {
                const fd = vol.openSync('/test.txt', 'w');
                const usedFdLength = vol.releasedFds.length;
                vol.closeSync(fd);
                expect(usedFdLength).to.be.lessThan(vol.releasedFds.length);
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
        describe('.writeFileSync(path, data[, options])', () => {
            const vol = new Volume;
            const data = 'asdfasidofjasdf';
            it('Create a file at root (/writeFileSync.txt)', () => {
                vol.writeFileSync('/writeFileSync.txt', data);

                const node = vol.root.getChild('writeFileSync.txt').getNode();
                expect(node).to.be.an.instanceof(Node);
                expect(node.getString()).to.equal(data);
            });
            it('Write to file by file descriptor', () => {
                const fd = vol.openSync('/writeByFd.txt', 'w');
                vol.writeFileSync(fd, data);

                const node = vol.root.getChild('writeByFd.txt').getNode();
                expect(node).to.be.an.instanceof(Node);
                expect(node.getString()).to.equal(data);
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
    });
});