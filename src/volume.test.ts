import {Node} from "./node";
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
        describe('.getNode(steps)', () => {
            const vol = (new Volume) as any;
            it('[] - Get the root node', () => {
                const node = vol.getNode([]);
                expect(node).to.be.an.instanceof(Node);
                expect(node).to.equal(vol.root);
            });
            it('["child.sh"] - Get a child node', () => {
                const node1 = vol.root.createChild('child.sh');
                const node2 = vol.getNode(['child.sh']);
                expect(node1).to.equal(node2);
            });
            it('["dir", "child.sh"] - Get a child node in a dir', () => {
                const dir = vol.root.createChild('dir');
                const node1 = dir.createChild('child.sh');
                const node2 = vol.getNode(['dir', 'child.sh']);
                expect(node1).to.equal(node2);
            });
        });
        describe('.openSync(path, flags[, mode])', () => {
            const vol = new Volume;
            it('Create new file at root (/test.txt)', () => {
                const fd = vol.openSync('/test.txt', 'w');
                expect(vol.root.children['test.txt']).to.be.an.instanceof(Node);
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
                    expect(vol.root.children['test.txt']).to.be.an.instanceof(Node);
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
        describe('.readFileSync(path[, options])', () => {
            const vol = new Volume;
            const data = 'trololo';
            const fileNode = vol.root.createChild('text.txt', false);
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
                const dir1 = vol.root.createChild('dir1', true);
                const dir2 = dir1.createChild('dir2', true);
                const fileNode = dir2.createChild('test-file', false);
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
            const fileNode = vol.root.createChild('file.txt', false);
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

                const node = vol.root.children['writeFileSync.txt'];
                expect(node).to.be.an.instanceof(Node);
                expect(node.getString()).to.equal(data);
            });
            it('Write to file by file descriptor', () => {
                const fd = vol.openSync('/writeByFd.txt', 'w');
                vol.writeFileSync(fd, data);

                const node = vol.root.children['writeByFd.txt'];
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
                    const str = vol.root.getChild('writeFile.json').getString();
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
            const jquery = vol.root.createChild('jquery.js');
            const data = '"use strict";';
            jquery.setString(data);
            it('Create a symlink', () => {
                vol.symlinkSync('/jquery.js', '/test.js');
                expect(vol.root.children['test.js']).to.be.an.instanceof(Node);
                expect(vol.root.children['test.js'].isSymlink()).to.equal(true);
            });
            it('Read from symlink', () => {
                vol.symlinkSync('/jquery.js', '/test2.js');
                expect(vol.readFileSync('/test2.js').toString()).to.equal(data);
            });
        });
    });
});