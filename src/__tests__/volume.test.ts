import { URL } from 'url';
import { Link } from '../node';
import Stats from '../Stats';
import Dirent from '../Dirent';
import { Volume, filenameToSteps, StatWatcher } from '../volume';
import hasBigInt from './hasBigInt';
import { tryGetChild, tryGetChildNode } from './util';

describe('volume', () => {
  describe('filenameToSteps(filename): string[]', () => {
    it('/ -> []', () => {
      expect(filenameToSteps('/')).toEqual([]);
    });
    it('/test -> ["test"]', () => {
      expect(filenameToSteps('/test')).toEqual(['test']);
    });
    it('/usr/bin/node.sh -> ["usr", "bin", "node.sh"]', () => {
      expect(filenameToSteps('/usr/bin/node.sh')).toEqual(['usr', 'bin', 'node.sh']);
    });
    it('/dir/file.txt -> ["dir", "file.txt"]', () => {
      expect(filenameToSteps('/dir/file.txt')).toEqual(['dir', 'file.txt']);
    });
    it('/dir/./file.txt -> ["dir", "file.txt"]', () => {
      expect(filenameToSteps('/dir/./file.txt')).toEqual(['dir', 'file.txt']);
    });
    it('/dir/../file.txt -> ["file.txt"]', () => {
      expect(filenameToSteps('/dir/../file.txt')).toEqual(['file.txt']);
    });
  });
  describe('Volume', () => {
    it('.genRndStr()', () => {
      const vol = new Volume();
      for (let i = 0; i < 100; i++) {
        const str = vol.genRndStr();
        expect(typeof str === 'string').toBe(true);
        expect(str.length).toBe(6);
      }
    });
    describe('.getLink(steps)', () => {
      const vol = new Volume();
      it('[] - Get the root link', () => {
        const link = vol.getLink([]);
        expect(link).toBeInstanceOf(Link);
        expect(link).toBe(vol.root);
      });
      it('["child.sh"] - Get a child link', () => {
        const link1 = vol.root.createChild('child.sh');
        const link2 = vol.getLink(['child.sh']);
        expect(link1).toBe(link2);
      });
      it('["dir", "child.sh"] - Get a child link in a dir', () => {
        const dir = vol.root.createChild('dir');
        const link1 = dir.createChild('child.sh');
        const node2 = vol.getLink(['dir', 'child.sh']);
        expect(link1).toBe(node2);
      });
    });
    describe('i-nodes', () => {
      it('i-node numbers are unique', () => {
        const vol = Volume.fromJSON({
          '/1': 'foo',
          '/2': 'bar',
        });
        const stat1 = vol.statSync('/1');
        const stat2 = vol.statSync('/2');
        expect(stat1.ino === stat2.ino).toBe(false);
      });
    });

    describe('.toJSON()', () => {
      it('Single file', () => {
        const vol = new Volume();
        vol.writeFileSync('/test', 'Hello');
        expect(vol.toJSON()).toEqual({ '/test': 'Hello' });
      });

      it('Multiple files', () => {
        const vol = new Volume();
        vol.writeFileSync('/test', 'Hello');
        vol.writeFileSync('/test2', 'Hello2');
        vol.writeFileSync('/test.txt', 'Hello3');
        expect(vol.toJSON()).toEqual({
          '/test': 'Hello',
          '/test2': 'Hello2',
          '/test.txt': 'Hello3',
        });
      });

      it('With folders, skips empty folders', () => {
        const vol = new Volume();
        vol.writeFileSync('/test', 'Hello');
        vol.mkdirSync('/dir');
        vol.mkdirSync('/dir/dir2');

        // Folder `/dir3` will be empty, and should not be in the JSON aoutput.
        vol.mkdirSync('/dir3');

        vol.writeFileSync('/dir/abc', 'abc');
        vol.writeFileSync('/dir/abc2', 'abc2');
        vol.writeFileSync('/dir/dir2/hello.txt', 'world');
        expect(vol.toJSON()).toEqual({
          '/test': 'Hello',
          '/dir/abc': 'abc',
          '/dir/abc2': 'abc2',
          '/dir/dir2/hello.txt': 'world',
          '/dir3': null,
        });
      });

      it('Specify export path', () => {
        const vol = Volume.fromJSON({
          '/foo': 'bar',
          '/dir/a': 'b',
        });
        expect(vol.toJSON('/dir')).toEqual({
          '/dir/a': 'b',
        });
      });

      it('Specify multiple export paths', () => {
        const vol = Volume.fromJSON({
          '/foo': 'bar',
          '/dir/a': 'b',
          '/dir2/a': 'b',
          '/dir2/c': 'd',
        });
        expect(vol.toJSON(['/dir2', '/dir'])).toEqual({
          '/dir/a': 'b',
          '/dir2/a': 'b',
          '/dir2/c': 'd',
        });
      });

      it('Specify a file export path', () => {
        const vol = Volume.fromJSON({
          '/foo': 'bar',
          '/dir/a': 'b',
          '/dir2/a': 'b',
          '/dir2/c': 'd',
        });
        expect(vol.toJSON(['/dir/a'])).toEqual({
          '/dir/a': 'b',
        });
      });

      it('Accumulate exports on supplied object', () => {
        const vol = Volume.fromJSON({
          '/foo': 'bar',
        });
        const obj = {};
        expect(vol.toJSON('/', obj)).toBe(obj);
      });

      it('Export empty volume', () => {
        const vol = Volume.fromJSON({});
        expect(vol.toJSON()).toEqual({});
      });

      it('Exporting non-existing path', () => {
        const vol = Volume.fromJSON({});
        expect(vol.toJSON('/lol')).toEqual({});
      });

      it('Serializes empty dirs as null', () => {
        const vol = Volume.fromJSON({
          '/dir': null,
        });

        expect(vol.toJSON()).toEqual({
          '/dir': null,
        });
      });

      it('Serializes only empty dirs', () => {
        const vol = Volume.fromJSON({
          '/dir': null,
          '/dir/dir2': null,
          '/dir/dir2/foo': null,
          '/empty': null,
        });

        expect(vol.toJSON()).toEqual({
          '/dir/dir2/foo': null,
          '/empty': null,
        });
      });
    });

    describe('.fromJSON(json[, cwd])', () => {
      it('Files at root', () => {
        const vol = new Volume();
        const json = {
          '/hello': 'world',
          '/app.js': 'console.log(123)',
        };
        vol.fromJSON(json);
        expect(vol.toJSON()).toEqual(json);
      });

      it('Files and directories at root with relative paths', () => {
        const vol = new Volume();
        const json = {
          hello: 'world',
          'app.js': 'console.log(123)',
          dir: null,
        };
        vol.fromJSON(json, '/');
        expect(vol.toJSON()).toEqual({
          '/hello': 'world',
          '/app.js': 'console.log(123)',
          '/dir': null,
        });
      });

      it('Deeply nested tree', () => {
        const vol = new Volume();
        const json = {
          '/dir/file': '...',
          '/dir/dir/dir2/hello.sh': 'world',
          '/hello.js': 'console.log(123)',
          '/dir/dir/test.txt': 'Windows',
        };
        vol.fromJSON(json);
        expect(vol.toJSON()).toEqual(json);
      });

      it('Invalid JSON throws error', () => {
        try {
          const vol = new Volume();
          const json = {
            '/dir/file': '...',
            '/dir': 'world',
          };
          vol.fromJSON(json);
          throw Error('This should not throw');
        } catch (error) {
          // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
          expect(error.code === 'EISDIR' || error.code === 'ENOTDIR').toBe(true);
        }
      });

      it('Invalid JSON throws error 2', () => {
        try {
          const vol = new Volume();
          const json = {
            '/dir': 'world',
            '/dir/file': '...',
          };
          vol.fromJSON(json);
          throw Error('This should not throw');
        } catch (error) {
          // Check for both errors, because in JavaScript we the `json` map's key order is not guaranteed.
          expect(error.code === 'EISDIR' || error.code === 'ENOTDIR').toBe(true);
        }
      });

      it('creates a folder if value is not a string', () => {
        const vol = Volume.fromJSON({
          '/dir': null,
        });
        const stat = vol.statSync('/dir');

        expect(stat.isDirectory()).toBe(true);
        expect(vol.readdirSync('/dir')).toEqual([]);
      });
    });

    describe('.fromNestedJSON(nestedJSON[, cwd])', () => {
      it('Accept a nested dict as input because its nicer to read', () => {
        const vol1 = new Volume();
        const vol2 = new Volume();

        const jsonFlat = {
          '/dir/file': '...',
          '/emptyDir': null,
          '/anotherEmptyDir': null,
          '/oneMoreEmptyDir': null,
          '/dir/dir/dir2/hello.sh': 'world',
          '/hello.js': 'console.log(123)',
          '/dir/dir/test.txt': 'File with leading slash',
        };
        const jsonNested = {
          '/dir/': {
            file: '...',
            dir: {
              dir2: {
                'hello.sh': 'world',
              },
              '/test.txt': 'File with leading slash',
            },
          },
          '/emptyDir': {},
          '/anotherEmptyDir': null,
          '/oneMoreEmptyDir': {
            '': null, // this could be considered a glitch, but "" is not a valid filename anyway
            // (same as 'file/name' is invalid and would lead to problems)
          },
          '/hello.js': 'console.log(123)',
        };

        vol1.fromJSON(jsonFlat);
        vol2.fromNestedJSON(jsonNested);

        expect(vol1.toJSON()).toEqual(vol2.toJSON());
      });
    });

    describe('.reset()', () => {
      it('Remove all files', () => {
        const vol = new Volume();
        const json = {
          '/hello': 'world',
          '/app.js': 'console.log(123)',
        };
        vol.fromJSON(json);
        vol.reset();
        expect(vol.toJSON()).toEqual({});
      });
      it('File operations should work after reset', () => {
        const vol = new Volume();
        const json = {
          '/hello': 'world',
        };
        vol.fromJSON(json);
        vol.reset();
        vol.writeFileSync('/good', 'bye');
        expect(vol.toJSON()).toEqual({
          '/good': 'bye',
        });
      });
    });
    describe('.openSync(path, flags[, mode])', () => {
      const vol = new Volume();
      it('Create new file at root (/test.txt)', () => {
        const fd = vol.openSync('/test.txt', 'w');
        expect(vol.root.getChild('test.txt')).toBeInstanceOf(Link);
        expect(typeof fd).toBe('number');
        expect(fd).toBeGreaterThan(0);
      });
      it('Error on file not found', () => {
        try {
          vol.openSync('/non-existing-file.txt', 'r');
          throw Error('This should not throw');
        } catch (err) {
          expect(err.code).toBe('ENOENT');
        }
      });
      it('Invalid path correct error code', () => {
        try {
          (vol as any).openSync(123, 'r');
          throw Error('This should not throw');
        } catch (err) {
          expect(err).toBeInstanceOf(TypeError);
          expect(err.message).toBe('path must be a string or Buffer');
        }
      });
      it('Invalid flags correct error code', () => {
        try {
          (vol as any).openSync('/non-existing-file.txt');
          throw Error('This should not throw');
        } catch (err) {
          expect(err.code).toBe('ERR_INVALID_OPT_VALUE');
        }
      });
      it('Invalid mode correct error code', () => {
        try {
          vol.openSync('/non-existing-file.txt', 'r', 'adfasdf');
          throw Error('This should not throw');
        } catch (err) {
          expect(err).toBeInstanceOf(TypeError);
          expect(err.message).toBe('mode must be an int');
        }
      });
      it('Open multiple files', () => {
        const fd1 = vol.openSync('/1.json', 'w');
        const fd2 = vol.openSync('/2.json', 'w');
        const fd3 = vol.openSync('/3.json', 'w');
        const fd4 = vol.openSync('/4.json', 'w');
        expect(typeof fd1).toBe('number');
        expect(fd1 !== fd2).toBe(true);
        expect(fd2 !== fd3).toBe(true);
        expect(fd3 !== fd4).toBe(true);
      });
    });
    describe('.open(path, flags[, mode], callback)', () => {
      const vol = new Volume();
      vol.mkdirSync('/test-dir');
      it('Create new file at root (/test.txt)', done => {
        vol.open('/test.txt', 'w', (err, fd) => {
          expect(err).toBe(null);
          expect(vol.root.getChild('test.txt')).toBeInstanceOf(Link);
          expect(typeof fd).toBe('number');
          expect(fd).toBeGreaterThan(0);
          done();
        });
      });
      it('Error on file not found', done => {
        vol.open('/non-existing-file.txt', 'r', (err, fd) => {
          expect(err).toHaveProperty('code', 'ENOENT');
          done();
        });
      });
      it('Error with exclude flag if file exists', done => {
        vol.writeFileSync('/existing-file.txt', 'foo');
        vol.open('/existing-file.txt', 'wx', err => {
          expect(err).toHaveProperty('code', 'EEXIST');
          done();
        });
      });
      it('Invalid path correct error code thrown synchronously', done => {
        try {
          (vol as any).open(123, 'r', (err, fd) => {
            throw Error('This should not throw');
          });
          throw Error('This should not throw');
        } catch (err) {
          expect(err).toBeInstanceOf(TypeError);
          expect(err.message).toBe('path must be a string or Buffer');
          done();
        }
      });
      it('Invalid flags correct error code thrown synchronously', done => {
        try {
          (vol as any).open('/non-existing-file.txt', undefined, () => {
            throw Error('This should not throw');
          });
          throw Error('This should not throw');
        } catch (err) {
          expect(err.code).toBe('ERR_INVALID_OPT_VALUE');
          done();
        }
      });
      it('Invalid mode correct error code thrown synchronously', done => {
        try {
          (vol as any).openSync('/non-existing-file.txt', 'r', 'adfasdf', () => {
            throw Error('This should not throw');
          });
          throw Error('This should not throw');
        } catch (err) {
          expect(err).toBeInstanceOf(TypeError);
          expect(err.message).toBe('mode must be an int');
          done();
        }
      });
      it('Properly sets permissions from mode when creating a new file', done => {
        vol.writeFileSync('/a.txt', 'foo');
        const stats = vol.statSync('/a.txt');
        // Write a new file, copying the mode from the old file
        vol.open('/b.txt', 'w', stats.mode, (err, fd) => {
          expect(err).toBe(null);
          expect(vol.root.getChild('b.txt')).toBeInstanceOf(Link);
          expect(typeof fd).toBe('number');
          expect(tryGetChildNode(vol.root, 'b.txt').canWrite()).toBe(true);
          done();
        });
      });
      it('Error on incorrect flags for directory', done => {
        vol.open('/test-dir', 'r+', (err, fd) => {
          expect(err).toHaveProperty('code', 'EISDIR');
          done();
        });
      });
      it('Properly opens directory as read-only', done => {
        vol.open('/test-dir', 'r', (err, fd) => {
          expect(err).toBe(null);
          expect(typeof fd).toBe('number');
          done();
        });
      });
    });
    describe('.close(fd, callback)', () => {
      const vol = new Volume();
      it('Closes file without errors', done => {
        vol.open('/test.txt', 'w', (err, fd) => {
          expect(err).toBe(null);
          vol.close(fd || -1, err => {
            expect(err).toBe(null);
            done();
          });
        });
      });
    });
    describe('.read(fd, buffer, offset, length, position, callback)', () => {
      xit('...', () => {});
    });
    describe('.readFileSync(path[, options])', () => {
      const vol = new Volume();
      const data = 'trololo';
      const fileNode = (vol as any).createLink(vol.root, 'text.txt').getNode();
      fileNode.setString(data);
      it('Read file at root (/text.txt)', () => {
        const buf = vol.readFileSync('/text.txt');
        const str = buf.toString();
        expect(buf).toBeInstanceOf(Buffer);
        expect(str).toBe(data);
      });
      it('Read file with path passed as URL', () => {
        const str = vol.readFileSync(new URL('file:///text.txt')).toString();
        expect(str).toBe(data);
      });
      it('Specify encoding as string', () => {
        const str = vol.readFileSync('/text.txt', 'utf8');
        expect(str).toBe(data);
      });
      it('Specify encoding in object', () => {
        const str = vol.readFileSync('/text.txt', { encoding: 'utf8' });
        expect(str).toBe(data);
      });
      it('Read file deep in tree (/dir1/dir2/test-file)', () => {
        const dir1 = (vol as any).createLink(vol.root, 'dir1', true);
        const dir2 = (vol as any).createLink(dir1, 'dir2', true);
        const fileNode = (vol as any).createLink(dir2, 'test-file').getNode();
        const data = 'aaaaaa';
        fileNode.setString(data);

        const str = vol.readFileSync('/dir1/dir2/test-file').toString();
        expect(str).toBe(data);
      });
      it('Invalid options should throw', () => {
        try {
          // Expecting this line to throw
          vol.readFileSync('/text.txt', 123 as any);
          throw Error('This should not throw');
        } catch (err) {
          expect(err).toBeInstanceOf(TypeError);
          // TODO: Check the right error message.
        }
      });
      it('Attempt to read a directory should throw EISDIR', () => {
        const vol = new Volume();
        vol.mkdirSync('/test');
        const fn = () => vol.readFileSync('/test');
        expect(fn).toThrowError('EISDIR');
      });
      it('Attempt to read a non-existing file should throw ENOENT', () => {
        const fn = () => vol.readFileSync('/pizza.txt');
        expect(fn).toThrowError('ENOENT');
      });
    });
    describe('.readFile(path[, options], callback)', () => {
      const vol = new Volume();
      const data = 'asdfasdf asdfasdf asdf';
      const fileNode = (vol as any).createLink(vol.root, 'file.txt').getNode();
      fileNode.setString(data);
      it('Read file at root (/file.txt)', done => {
        vol.readFile('/file.txt', 'utf8', (err, str) => {
          expect(err).toBe(null);
          expect(str).toBe(data);
          done();
        });
      });
    });
    describe('.writeSync(fd, str, position, encoding)', () => {
      const vol = new Volume();
      it('Simple write to a file descriptor', () => {
        const fd = vol.openSync('/test.txt', 'w+');
        const data = 'hello';
        const bytes = vol.writeSync(fd, data);
        vol.closeSync(fd);
        expect(bytes).toBe(data.length);
        expect(vol.readFileSync('/test.txt', 'utf8')).toBe(data);
      });
      it('Multiple writes to a file', () => {
        const fd = vol.openSync('/multi.txt', 'w+');
        const datas = ['hello', ' ', 'world', '!'];
        let bytes = 0;
        for (const data of datas) {
          const b = vol.writeSync(fd, data);
          expect(b).toBe(data.length);
          bytes += b;
        }
        vol.closeSync(fd);
        const result = datas.join('');
        expect(bytes).toBe(result.length);
        expect(vol.readFileSync('/multi.txt', 'utf8')).toBe(result);
      });
      it('Overwrite part of file', () => {
        const fd = vol.openSync('/overwrite.txt', 'w+');
        vol.writeSync(fd, 'martini');
        vol.writeSync(fd, 'Armagedon', 1, 'utf8');
        vol.closeSync(fd);
        expect(vol.readFileSync('/overwrite.txt', 'utf8')).toBe('mArmagedon');
      });
    });
    describe('.write(fd, buffer, offset, length, position, callback)', () => {
      it('Simple write to a file descriptor', done => {
        const vol = new Volume();
        const fd = vol.openSync('/test.txt', 'w+');
        const data = 'hello';
        vol.write(fd, Buffer.from(data), (err, bytes, buf) => {
          vol.closeSync(fd);
          expect(err).toBe(null);
          expect(vol.readFileSync('/test.txt', 'utf8')).toBe(data);
          done();
        });
      });
    });
    describe('.writeFile(path, data[, options], callback)', () => {
      const vol = new Volume();
      const data = 'asdfasidofjasdf';
      it('Create a file at root (/writeFile.json)', done => {
        vol.writeFile('/writeFile.json', data, err => {
          expect(err).toBe(null);
          const str = tryGetChildNode(vol.root, 'writeFile.json').getString();
          expect(str).toBe(data);
          done();
        });
      });
      it('Create a file at root (/writeFile2.json) with exclude flag', done => {
        vol.writeFile('/writeFile2.json', data, { flag: 'wx' }, err => {
          expect(err).toBe(null);
          const str = tryGetChildNode(vol.root, 'writeFile2.json').getString();
          expect(str).toBe(data);
          done();
        });
      });
      it('Throws error when no callback provided', () => {
        try {
          vol.writeFile('/asdf.txt', 'asdf', 'utf8', undefined as any);
          throw Error('This should not throw');
        } catch (err) {
          expect(err.message).toBe('callback must be a function');
        }
      });
    });
    describe('.symlinkSync(target, path[, type])', () => {
      const vol = new Volume();
      const jquery = (vol as any).createLink(vol.root, 'jquery.js').getNode();
      const data = '"use strict";';
      jquery.setString(data);
      it('Create a symlink', () => {
        vol.symlinkSync('/jquery.js', '/test.js');
        expect(vol.root.getChild('test.js')).toBeInstanceOf(Link);
        expect(tryGetChildNode(vol.root, 'test.js').isSymlink()).toBe(true);
      });
      it('Read from symlink', () => {
        vol.symlinkSync('/jquery.js', '/test2.js');
        expect(vol.readFileSync('/test2.js').toString()).toBe(data);
      });
      describe('Complex, deep, multi-step symlinks get resolved', () => {
        it('Symlink to a folder', () => {
          const vol = Volume.fromJSON({ '/a1/a2/a3/a4/a5/hello.txt': 'world!' });
          vol.symlinkSync('/a1', '/b1');
          expect(vol.readFileSync('/b1/a2/a3/a4/a5/hello.txt', 'utf8')).toBe('world!');
        });
        it('Symlink to a folder to a folder', () => {
          const vol = Volume.fromJSON({ '/a1/a2/a3/a4/a5/hello.txt': 'world!' });
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
          expect(vol.readFileSync('/c1/c2/c3/c4/c5/final/a3/a4/a5/hello.txt', 'utf8')).toBe('world a');
        });
      });
    });
    describe('.symlink(target, path[, type], callback)', () => {
      xit('...', () => {});
    });
    describe('.realpathSync(path[, options])', () => {
      const vol = new Volume();
      const mootools = vol.root.createChild('mootools.js');
      const data = 'String.prototype...';
      mootools.getNode().setString(data);

      const symlink = vol.root.createChild('mootools.link.js');
      symlink.getNode().makeSymlink(['mootools.js']);

      it('Symlink works', () => {
        const resolved = vol.resolveSymlinks(symlink);
        expect(resolved).toBe(mootools);
      });
      it('Basic one-jump symlink resolves', () => {
        const path = vol.realpathSync('/mootools.link.js');
        expect(path).toBe('/mootools.js');
      });
      it('Basic one-jump symlink with /./ and /../ in path', () => {
        const path = vol.realpathSync('/./lol/../mootools.link.js');
        expect(path).toBe('/mootools.js');
      });
    });
    describe('.realpath(path[, options], callback)', () => {
      const vol = new Volume();
      const mootools = vol.root.createChild('mootools.js');
      const data = 'String.prototype...';
      mootools.getNode().setString(data);

      const symlink = vol.root.createChild('mootools.link.js');
      symlink.getNode().makeSymlink(['mootools.js']);

      it('Basic one-jump symlink resolves', done => {
        vol.realpath('/mootools.link.js', (err, path) => {
          expect(path).toBe('/mootools.js');
          done();
        });
      });
      it('Basic one-jump symlink with /./ and /../ in path', () => {
        vol.realpath('/./lol/../mootools.link.js', (err, path) => {
          expect(path).toBe('/mootools.js');
        });
      });
    });
    describe('.statSync(path, options)', () => {
      const vol = new Volume();

      it('Does not throw when entry does not exist if throwIfNoEntry is false', () => {
        const stat = vol.statSync('/foo', { throwIfNoEntry: false });
        expect(stat).toBeUndefined();
      });
      it('Throws when entry does not exist if throwIfNoEntry is true', () => {
        expect(() => vol.statSync('/foo', { throwIfNoEntry: true })).toThrow();
      });
      it('Throws when entry does not exist if throwIfNoEntry is not specified', () => {
        expect(() => vol.statSync('/foo')).toThrow();
      });
      it('Throws when entry does not exist if throwIfNoEntry is explicitly undefined', () => {
        expect(() => vol.statSync('/foo', { throwIfNoEntry: undefined })).toThrow();
      });
    });
    describe('.lstatSync(path, options)', () => {
      const vol = new Volume();

      it('Does not throw when entry does not exist if throwIfNoEntry is false', () => {
        const stat = vol.lstatSync('/foo', { throwIfNoEntry: false });
        expect(stat).toBeUndefined();
      });
      it('Throws when entry does not exist if throwIfNoEntry is true', () => {
        expect(() => vol.lstatSync('/foo', { throwIfNoEntry: true })).toThrow();
      });
      it('Throws when entry does not exist if throwIfNoEntry is not specified', () => {
        expect(() => vol.lstatSync('/foo')).toThrow();
      });
      it('Throws when entry does not exist if throwIfNoEntry is explicitly undefined', () => {
        expect(() => vol.lstatSync('/foo', { throwIfNoEntry: undefined })).toThrow();
      });
    });
    describe('.lstatSync(path)', () => {
      const vol = new Volume();
      const dojo = vol.root.createChild('dojo.js');
      const data = '(function(){})();';
      dojo.getNode().setString(data);

      it('Returns basic file stats', () => {
        const stats = vol.lstatSync('/dojo.js');
        expect(stats).toBeInstanceOf(Stats);
        expect(stats.size).toBe(data.length);
        expect(stats.isFile()).toBe(true);
        expect(stats.isDirectory()).toBe(false);
      });
      it('Returns file stats using BigInt', () => {
        if (hasBigInt) {
          const stats = vol.lstatSync('/dojo.js', { bigint: true });
          expect(typeof stats.ino).toBe('bigint');
        } else {
          expect(() => vol.lstatSync('/dojo.js', { bigint: true })).toThrowError();
        }
      });
      it('Stats on symlink returns results about the symlink', () => {
        vol.symlinkSync('/dojo.js', '/link.js');
        const stats = vol.lstatSync('/link.js');
        expect(stats.isSymbolicLink()).toBe(true);
        expect(stats.isFile()).toBe(false);
        expect(stats.size).toBe(0);
      });
    });
    describe('.lstat(path, callback)', () => {
      xit('...', () => {});
    });
    describe('.statSync(path)', () => {
      const vol = new Volume();
      const dojo = vol.root.createChild('dojo.js');
      const data = '(function(){})();';
      dojo.getNode().setString(data);
      it('Returns basic file stats', () => {
        const stats = vol.statSync('/dojo.js');
        expect(stats).toBeInstanceOf(Stats);
        expect(stats.size).toBe(data.length);
        expect(stats.isFile()).toBe(true);
        expect(stats.isDirectory()).toBe(false);
      });
      it('Returns file stats using BigInt', () => {
        if (hasBigInt) {
          const stats = vol.statSync('/dojo.js', { bigint: true });
          expect(typeof stats.ino).toBe('bigint');
        } else {
          expect(() => vol.statSync('/dojo.js', { bigint: true })).toThrowError();
        }
      });
      it('Stats on symlink returns results about the resolved file', () => {
        vol.symlinkSync('/dojo.js', '/link.js');
        const stats = vol.statSync('/link.js');
        expect(stats.isSymbolicLink()).toBe(false);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBe(data.length);
      });
      it('Modification new write', done => {
        vol.writeFileSync('/mtime.txt', '1');
        const stats1 = vol.statSync('/mtime.txt');
        setTimeout(() => {
          vol.writeFileSync('/mtime.txt', '2');
          const stats2 = vol.statSync('/mtime.txt');
          expect(stats2.mtimeMs).toBeGreaterThan(stats1.mtimeMs);
          done();
        }, 2);
      });
    });
    describe('.stat(path, callback)', () => {
      xit('...', () => {});
    });
    describe('.fstatSync(fd)', () => {
      const vol = new Volume();
      const dojo = vol.root.createChild('dojo.js');
      const data = '(function(){})();';
      dojo.getNode().setString(data);

      it('Returns basic file stats', () => {
        const fd = vol.openSync('/dojo.js', 'r');
        const stats = vol.fstatSync(fd);
        expect(stats).toBeInstanceOf(Stats);
        expect(stats.size).toBe(data.length);
        expect(stats.isFile()).toBe(true);
        expect(stats.isDirectory()).toBe(false);
      });
      it('Returns file stats using BigInt', () => {
        const fd = vol.openSync('/dojo.js', 'r');
        if (hasBigInt) {
          const stats = vol.fstatSync(fd, { bigint: true });
          expect(typeof stats.ino).toBe('bigint');
        } else {
          expect(() => vol.fstatSync(fd, { bigint: true })).toThrowError();
        }
      });
    });
    describe('.fstat(fd, callback)', () => {
      xit('...', () => {});
    });
    describe('.linkSync(existingPath, newPath)', () => {
      const vol = new Volume();
      it('Create a new link', () => {
        const data = '123';
        vol.writeFileSync('/1.txt', data);
        vol.linkSync('/1.txt', '/2.txt');
        expect(vol.readFileSync('/1.txt', 'utf8')).toBe(data);
        expect(vol.readFileSync('/2.txt', 'utf8')).toBe(data);
      });
      it('nlink property of i-node increases when new link is created', () => {
        vol.writeFileSync('/a.txt', '123');
        vol.linkSync('/a.txt', '/b.txt');
        vol.linkSync('/a.txt', '/c.txt');
        const stats = vol.statSync('/b.txt');
        expect(stats.nlink).toBe(3);
      });
    });
    describe('.link(existingPath, newPath, callback)', () => {
      xit('...', () => {});
    });
    describe('.readdirSync(path)', () => {
      it('Returns simple list', () => {
        const vol = new Volume();
        vol.writeFileSync('/1.js', '123');
        vol.writeFileSync('/2.js', '123');
        const list = vol.readdirSync('/');
        expect(list.length).toBe(2);
        expect(list).toEqual(['1.js', '2.js']);
      });
      it('Returns a Dirent list', () => {
        const vol = new Volume();
        vol.writeFileSync('/1', '123');
        vol.mkdirSync('/2');
        const list = vol.readdirSync('/', { withFileTypes: true });
        expect(list.length).toBe(2);
        expect(list[0]).toBeInstanceOf(Dirent);
        const dirent0 = list[0] as Dirent;
        expect(dirent0.name).toBe('1');
        expect(dirent0.isFile()).toBe(true);
        const dirent1 = list[1] as Dirent;
        expect(dirent1.name).toBe('2');
        expect(dirent1.isDirectory()).toBe(true);
      });
    });
    describe('.readdir(path, callback)', () => {
      xit('...', () => {});
    });
    describe('.readlinkSync(path[, options])', () => {
      it('Simple symbolic link to one file', () => {
        const vol = new Volume();
        vol.writeFileSync('/1', '123');
        vol.symlinkSync('/1', '/2');
        const res = vol.readlinkSync('/2');
        expect(res).toBe('/1');
      });
    });
    describe('.readlink(path[, options], callback)', () => {
      it('Simple symbolic link to one file', done => {
        const vol = new Volume();
        vol.writeFileSync('/1', '123');
        vol.symlink('/1', '/2', err => {
          vol.readlink('/2', (err, res) => {
            expect(res).toBe('/1');
            done();
          });
        });
      });
    });
    describe('.fsyncSync(fd)', () => {
      const vol = new Volume();
      const fd = vol.openSync('/lol', 'w');
      it('Executes without crashing', () => {
        vol.fsyncSync(fd);
      });
    });
    describe('.fsync(fd, callback)', () => {
      const vol = new Volume();
      const fd = vol.openSync('/lol', 'w');
      it('Executes without crashing', done => {
        vol.fsync(fd, done);
      });
    });
    describe('.ftruncateSync(fd[, len])', () => {
      const vol = new Volume();
      it('Truncates to 0 single file', () => {
        const fd = vol.openSync('/trunky', 'w');
        vol.writeFileSync(fd, '12345');
        expect(vol.readFileSync('/trunky', 'utf8')).toBe('12345');
        vol.ftruncateSync(fd);
        expect(vol.readFileSync('/trunky', 'utf8')).toBe('');
      });
    });
    describe('.ftruncate(fd[, len], callback)', () => {
      xit('...', () => {});
    });
    describe('.truncateSync(path[, len])', () => {
      const vol = new Volume();
      it('Truncates to 0 single file', () => {
        const fd = vol.openSync('/trunky', 'w');
        vol.writeFileSync(fd, '12345');
        expect(vol.readFileSync('/trunky', 'utf8')).toBe('12345');
        vol.truncateSync('/trunky');
        expect(vol.readFileSync('/trunky', 'utf8')).toBe('');
      });
      it('Partial truncate', () => {
        const fd = vol.openSync('/1', 'w');
        vol.writeFileSync(fd, '12345');
        expect(vol.readFileSync('/1', 'utf8')).toBe('12345');
        vol.truncateSync('/1', 2);
        expect(vol.readFileSync('/1', 'utf8')).toBe('12');
      });
      it('Larger truncate', () => {
        const fd = vol.openSync('/2', 'w');
        vol.writeFileSync(fd, '12345');
        expect(vol.readFileSync('/2', 'utf8')).toBe('12345');
        vol.truncateSync('/2', 10);
        expect(vol.readFileSync('/2', 'utf8')).toBe('12345\0\0\0\0\0');
      });
    });
    describe('.truncate(path[, len], callback)', () => {
      xit('...', () => {});
    });
    describe('.utimesSync(path, atime, mtime)', () => {
      const vol = new Volume();
      it('Set times on file', () => {
        vol.writeFileSync('/lol', '12345');
        vol.utimesSync('/lol', 1234, 12345);
        const stats = vol.statSync('/lol');
        expect(Math.round(stats.atime.getTime() / 1000)).toBe(1234);
        expect(Math.round(stats.mtime.getTime() / 1000)).toBe(12345);
      });
    });
    describe('.utimes(path, atime, mtime, callback)', () => {
      xit('...', () => {});
    });
    describe('.mkdirSync(path[, options])', () => {
      it('Create dir at root', () => {
        const vol = new Volume();
        vol.mkdirSync('/test');
        const child = tryGetChild(vol.root, 'test');
        expect(child).toBeInstanceOf(Link);
        expect(child.getNode().isDirectory()).toBe(true);
      });
      it('Create 2 levels deep folders', () => {
        const vol = new Volume();
        vol.mkdirSync('/dir1');
        vol.mkdirSync('/dir1/dir2');
        const dir1 = tryGetChild(vol.root, 'dir1');
        expect(dir1).toBeInstanceOf(Link);
        expect(dir1.getNode().isDirectory()).toBe(true);
        const dir2 = tryGetChild(dir1, 'dir2');
        expect(dir2).toBeInstanceOf(Link);
        expect(dir2.getNode().isDirectory()).toBe(true);
        expect(dir2.getPath()).toBe('/dir1/dir2');
      });
      it('Create /dir1/dir2/dir3 recursively', () => {
        const vol = new Volume();
        vol.mkdirSync('/dir1/dir2/dir3', { recursive: true });
        const dir1 = tryGetChild(vol.root, 'dir1');
        const dir2 = tryGetChild(dir1, 'dir2');
        const dir3 = tryGetChild(dir2, 'dir3');
        expect(dir1).toBeInstanceOf(Link);
        expect(dir2).toBeInstanceOf(Link);
        expect(dir3).toBeInstanceOf(Link);
        expect(dir1.getNode().isDirectory()).toBe(true);
        expect(dir2.getNode().isDirectory()).toBe(true);
        expect(dir3.getNode().isDirectory()).toBe(true);
      });
    });
    describe('.mkdir(path[, mode], callback)', () => {
      xit('...', () => {});
      xit('Create /dir1/dir2/dir3', () => {});
    });
    describe('.mkdtempSync(prefix[, options])', () => {
      it('Create temp dir at root', () => {
        const vol = new Volume();
        const name = vol.mkdtempSync('/tmp-');
        vol.writeFileSync(name + '/file.txt', 'lol');
        expect(vol.toJSON()).toEqual({ [name + '/file.txt']: 'lol' });
      });
      it('throws when prefix is not a string', () => {
        const vol = new Volume();
        expect(() => vol.mkdtempSync({} as string)).toThrow(TypeError);
      });
      it('throws when prefix contains null bytes', () => {
        const vol = new Volume();
        expect(() => vol.mkdtempSync('/tmp-\u0000')).toThrow(/path.+string.+null bytes/i);
      });
    });
    describe('.mkdtemp(prefix[, options], callback)', () => {
      xit('Create temp dir at root', () => {});
      it('throws when prefix is not a string', () => {
        const vol = new Volume();
        expect(() => vol.mkdtemp({} as string, () => {})).toThrow(TypeError);
      });
      it('throws when prefix contains null bytes', () => {
        const vol = new Volume();
        expect(() => vol.mkdtemp('/tmp-\u0000', () => {})).toThrow(/path.+string.+null bytes/i);
      });
    });
    describe('.rmdirSync(path)', () => {
      it('Remove single dir', () => {
        const vol = new Volume();
        vol.mkdirSync('/dir');
        expect(tryGetChildNode(vol.root, 'dir').isDirectory()).toBe(true);
        vol.rmdirSync('/dir');
        expect(!!vol.root.getChild('dir')).toBe(false);
      });
      it('Remove dir /dir1/dir2/dir3 recursively', () => {
        const vol = new Volume();
        vol.mkdirSync('/dir1/dir2/dir3', { recursive: true });
        vol.rmdirSync('/dir1', { recursive: true });
        expect(!!vol.root.getChild('dir1')).toBe(false);
      });
    });
    describe('.rmdir(path, callback)', () => {
      xit('Remove single dir', () => {});
      it('Async remove dir /dir1/dir2/dir3 recursively', done => {
        const vol = new Volume();
        vol.mkdirSync('/dir1/dir2/dir3', { recursive: true });
        vol.rmdir('/dir1', { recursive: true }, () => {
          expect(!!vol.root.getChild('dir1')).toBe(false);
          done();
        });
      });
    });
    describe('.watchFile(path[, options], listener)', () => {
      it('Calls listener on .writeFile', done => {
        const vol = new Volume();
        vol.writeFileSync('/lol.txt', '1');
        setTimeout(() => {
          vol.watchFile('/lol.txt', { interval: 1 }, (curr, prev) => {
            process.nextTick(() => {
              vol.unwatchFile('/lol.txt');
              done();
            });
          });
          vol.writeFileSync('/lol.txt', '2');
        }, 1);
      });
      xit('Multiple listeners for one file', () => {});
    });
    describe('.unwatchFile(path[, listener])', () => {
      it('Stops watching before .writeFile', done => {
        const vol = new Volume();
        vol.writeFileSync('/lol.txt', '1');
        setTimeout(() => {
          let listenerCalled = false;
          vol.watchFile('/lol.txt', { interval: 1 }, (curr, prev) => {
            listenerCalled = true;
          });
          vol.unwatchFile('/lol.txt');
          vol.writeFileSync('/lol.txt', '2');
          setTimeout(() => {
            expect(listenerCalled).toBe(false);
            done();
          }, 10);
        }, 1);
      });
    });
    describe('.chmodSync(path, mode)', () => {
      it('works with directories', () => {
        const vol = new Volume();
        vol.mkdirSync('/dir');
        vol.chmodSync('/dir', 0o666);
        expect(vol.statSync('/dir').mode.toString(8)).toBe('40666');
        vol.chmodSync('/dir', 0o777);
        expect(vol.statSync('/dir').mode.toString(8)).toBe('40777');
      });
      it('works with files', () => {
        const vol = new Volume();
        vol.writeFileSync('/file', 'contents');
        vol.chmodSync('/file', 0o666);
        expect(vol.statSync('/file').mode.toString(8)).toBe('100666');
        vol.chmodSync('/file', 0o777);
        expect(vol.statSync('/file').mode.toString(8)).toBe('100777');
      });
    });
    describe('.promises', () => {
      it('Have a promises property', () => {
        const vol = new Volume();
        expect(typeof vol.promises).toBe('object');
      });
    });
  });
  describe('StatWatcher', () => {
    it('.vol points to current volume', () => {
      const vol = new Volume();
      expect(new StatWatcher(vol).vol).toBe(vol);
    });
  });
});
