"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const node_to_fsa_1 = require("../../node-to-fsa");
const FsaNodeFs_1 = require("../FsaNodeFs");
const thingies_1 = require("thingies");
const util_1 = require("../../__tests__/util");
const setup = (json = null, mode = 'readwrite') => {
    const { fs: mfs, vol } = (0, __1.memfs)({ mountpoint: json });
    const dir = (0, node_to_fsa_1.nodeToFsa)(mfs, '/mountpoint', { mode, syncHandleAllowed: true });
    const fs = new FsaNodeFs_1.FsaNodeFs(dir);
    return { fs, mfs, vol, dir };
};
(0, util_1.onlyOnNode20)('FsaNodeFs', () => {
    describe('.mkdir()', () => {
        test('can create a sub-folder', async () => {
            const { fs, mfs } = setup();
            await new Promise((resolve, reject) => fs.mkdir('/test', err => {
                if (err)
                    return reject(err);
                return resolve();
            }));
            expect(mfs.statSync('/mountpoint/test').isDirectory()).toBe(true);
        });
        test('can create a sub-folder with trailing slash', async () => {
            const { fs, mfs } = setup();
            await new Promise((resolve, reject) => fs.mkdir('/test/', err => {
                if (err)
                    return reject(err);
                return resolve();
            }));
            expect(mfs.statSync('/mountpoint/test').isDirectory()).toBe(true);
        });
        test('throws when creating sub-sub-folder', async () => {
            const { fs } = setup();
            try {
                await new Promise((resolve, reject) => fs.mkdir('/test/subtest', err => {
                    if (err)
                        return reject(err);
                    return resolve();
                }));
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
            }
        });
        test('can create sub-sub-folder with "recursive" flag', async () => {
            const { fs, mfs } = setup();
            await new Promise((resolve, reject) => fs.mkdir('/test/subtest', { recursive: true }, err => {
                if (err)
                    return reject(err);
                return resolve();
            }));
            expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
        });
        test('can create sub-sub-folder with "recursive" flag with Promises API', async () => {
            const { fs, mfs } = setup();
            await fs.promises.mkdir('/test/subtest', { recursive: true });
            expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
        });
        test('cannot create a folder over a file', async () => {
            const { fs } = setup({ file: 'test' });
            try {
                await fs.promises.mkdir('/file/folder', { recursive: true });
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOTDIR');
            }
        });
    });
    describe('.mkdtemp()', () => {
        test('can create a temporary folder', async () => {
            const { fs, mfs } = setup();
            const dirname = (await fs.promises.mkdtemp('prefix--'));
            expect(dirname.startsWith('prefix--')).toBe(true);
            expect(mfs.statSync('/mountpoint/' + dirname).isDirectory()).toBe(true);
        });
    });
    describe('.rmdir()', () => {
        test('can remove an empty folder', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            await fs.promises.rmdir('/empty-folder');
            expect(vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
        });
        test('throws when attempts to remove non-empty folder', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            try {
                await fs.promises.rmdir('/folder');
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOTEMPTY');
                expect(vol.toJSON()).toStrictEqual({
                    '/mountpoint/folder/file': 'test',
                    '/mountpoint/empty-folder': null,
                });
            }
        });
        test('can remove non-empty directory recursively', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rmdir('/folder', { recursive: true });
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/empty-folder': null,
            });
        });
        test('can remove starting from root folder', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rmdir('/', { recursive: true });
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint': null,
            });
        });
    });
    describe('.rm()', () => {
        test('can remove an empty folder', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            await fs.promises.rm('/empty-folder');
            expect(vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
        });
        test('throws when attempts to remove non-empty folder', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            try {
                await fs.promises.rm('/folder');
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOTEMPTY');
                expect(vol.toJSON()).toStrictEqual({
                    '/mountpoint/folder/file': 'test',
                    '/mountpoint/empty-folder': null,
                });
            }
        });
        test('can remove non-empty directory recursively', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rm('/folder', { recursive: true });
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/empty-folder': null,
            });
        });
        test('throws if path does not exist', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            try {
                await fs.promises.rm('/lala/lulu', { recursive: true });
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
                expect(vol.toJSON()).toStrictEqual({
                    '/mountpoint/folder/subfolder/file': 'test',
                    '/mountpoint/empty-folder': null,
                });
            }
        });
        test('does not throw, if path does not exist, but "force" flag set', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rm('/lala/lulu', { recursive: true, force: true });
        });
        test('can remove a file', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rm('/folder/subfolder/file');
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/subfolder': null,
                '/mountpoint/empty-folder': null,
            });
        });
        test('can remove starting from root folder', async () => {
            const { fs, vol } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
            await fs.promises.rm('/', { recursive: true });
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint': null,
            });
        });
    });
    describe('.unlink()', () => {
        test('can remove a file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const res = await fs.promises.unlink('/folder/file');
            expect(res).toBe(undefined);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder': null,
                '/mountpoint/empty-folder': null,
            });
        });
        test('cannot delete a folder', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            try {
                await fs.promises.unlink('/folder');
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('EISDIR');
                expect(vol.toJSON()).toStrictEqual({
                    '/mountpoint/folder/file': 'test',
                    '/mountpoint/empty-folder': null,
                });
            }
        });
        test('throws when deleting non-existing file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            try {
                await fs.promises.unlink('/folder/not-a-file');
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
                expect(vol.toJSON()).toStrictEqual({
                    '/mountpoint/folder/file': 'test',
                    '/mountpoint/empty-folder': null,
                });
            }
        });
    });
    describe('.readFile()', () => {
        test('can read file contents', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const data = await fs.promises.readFile('/folder/file');
            expect(data.toString()).toBe('test');
        });
        test('can read file by file handle', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const handle = await fs.promises.open('/folder/file');
            expect(typeof handle).toBe('object');
            const data = await fs.promises.readFile(handle);
            expect(data.toString()).toBe('test');
        });
        test('can read file by file descriptor', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const fd = await new Promise(resolve => {
                fs.open('/folder/file', 'r', (err, fd) => resolve(fd));
            });
            expect(typeof fd).toBe('number');
            const data = await new Promise(resolve => {
                fs.readFile(fd, { encoding: 'utf8' }, (err, data) => resolve(data));
            });
            expect(data).toBe('test');
        });
        test('cannot read from closed file descriptor', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const fd = await new Promise(resolve => {
                fs.open('/folder/file', 'r', (err, fd) => resolve(fd));
            });
            expect(typeof fd).toBe('number');
            await new Promise(resolve => {
                fs.close(fd, () => resolve());
            });
            try {
                await new Promise((resolve, reject) => {
                    fs.readFile(fd, { encoding: 'utf8' }, (err, data) => reject(err));
                });
                throw new Error('Expected error');
            }
            catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.code).toBe('EBADF');
            }
        });
    });
    describe('.truncate()', () => {
        test('can truncate a file', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const res = await new Promise((resolve, reject) => {
                fs.truncate('/folder/file', 2, (err, res) => (err ? reject(err) : resolve(res)));
            });
            expect(res).toBe(undefined);
            expect(mfs.readFileSync('/mountpoint/folder/file', 'utf8')).toBe('te');
        });
    });
    describe('.ftruncate()', () => {
        test('can truncate a file', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
            const handle = await fs.promises.open('/folder/file');
            const res = await new Promise((resolve, reject) => {
                fs.ftruncate(handle.fd, 3, (err, res) => (err ? reject(err) : resolve(res)));
            });
            expect(res).toBe(undefined);
            expect(mfs.readFileSync('/mountpoint/folder/file', 'utf8')).toBe('tes');
        });
    });
    describe('.readdir()', () => {
        test('can read directory contents as strings', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const res = (await fs.promises.readdir('/'));
            expect(res.length).toBe(3);
            expect(res.includes('folder')).toBe(true);
            expect(res.includes('empty-folder')).toBe(true);
            expect(res.includes('f.html')).toBe(true);
        });
        test('can read directory contents with "withFileTypes" flag set', async () => {
            var _a, _b, _c, _d;
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const list = (await fs.promises.readdir('/', { withFileTypes: true }));
            expect(list.length).toBe(3);
            const names = list.map(item => item.name);
            expect(names).toStrictEqual(['empty-folder', 'f.html', 'folder']);
            expect((_a = list.find(item => item.name === 'folder')) === null || _a === void 0 ? void 0 : _a.isDirectory()).toBe(true);
            expect((_b = list.find(item => item.name === 'empty-folder')) === null || _b === void 0 ? void 0 : _b.isDirectory()).toBe(true);
            expect((_c = list.find(item => item.name === 'f.html')) === null || _c === void 0 ? void 0 : _c.isFile()).toBe(true);
            expect((_d = list.find(item => item.name === 'f.html')) === null || _d === void 0 ? void 0 : _d.isDirectory()).toBe(false);
        });
    });
    describe('.appendFile()', () => {
        test('can create a file', async () => {
            const { fs, mfs } = setup({});
            await fs.promises.appendFile('/test.txt', 'a');
            expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('a');
        });
        test('can append to a file', async () => {
            const { fs, mfs } = setup({});
            await fs.promises.appendFile('/test.txt', 'a');
            await fs.promises.appendFile('/test.txt', 'b');
            expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('ab');
        });
        test('can append to a file - 2', async () => {
            const { fs, mfs } = setup({ file: '123' });
            await fs.promises.appendFile('file', 'x');
            expect(mfs.readFileSync('/mountpoint/file', 'utf8')).toBe('123x');
        });
        test('can append to a file - 2', async () => {
            const { fs, mfs } = setup({ file: '123' });
            await fs.promises.writeFile('cool.txt', 'worlds');
            await fs.promises.appendFile('cool.txt', '!');
            expect(mfs.readFileSync('/mountpoint/cool.txt', 'utf8')).toBe('worlds!');
        });
    });
    describe('.write()', () => {
        test('can write to a file', async () => {
            const { fs, mfs } = setup({});
            const fd = await new Promise((resolve, reject) => fs.open('/test.txt', 'w', (err, fd) => {
                if (err)
                    reject(err);
                else
                    resolve(fd);
            }));
            const [bytesWritten, data] = await new Promise((resolve, reject) => {
                fs.write(fd, 'a', (err, bytesWritten, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve([bytesWritten, data]);
                });
            });
            expect(bytesWritten).toBe(1);
            expect(data).toBe('a');
            expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('a');
        });
        test('can write to a file twice sequentially', async () => {
            const { fs, mfs } = setup({});
            const fd = await new Promise((resolve, reject) => fs.open('/test.txt', 'w', (err, fd) => {
                if (err)
                    reject(err);
                else
                    resolve(fd);
            }));
            const res1 = await new Promise((resolve, reject) => {
                fs.write(fd, 'a', (err, bytesWritten, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve([bytesWritten, data]);
                });
            });
            expect(res1[0]).toBe(1);
            expect(res1[1]).toBe('a');
            const res2 = await new Promise((resolve, reject) => {
                fs.write(fd, 'bc', (err, bytesWritten, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve([bytesWritten, data]);
                });
            });
            expect(res2[0]).toBe(2);
            expect(res2[1]).toBe('bc');
            expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('abc');
        });
    });
    describe('.writev()', () => {
        test('can write to a file two buffers', async () => {
            const { fs, mfs } = setup({});
            const fd = await new Promise((resolve, reject) => fs.open('/test.txt', 'w', (err, fd) => {
                if (err)
                    reject(err);
                else
                    resolve(fd);
            }));
            const [bytesWritten, data] = await new Promise((resolve, reject) => {
                const buffers = [Buffer.from('a'), Buffer.from('b')];
                fs.writev(fd, buffers, (err, bytesWritten, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve([bytesWritten, data]);
                });
            });
            expect(bytesWritten).toBe(2);
            expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('ab');
        });
    });
    describe('.exists()', () => {
        test('can works for folders and files', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const exists = async (path) => {
                return new Promise(resolve => {
                    fs.exists(path, exists => resolve(exists));
                });
            };
            expect(await exists('/folder')).toBe(true);
            expect(await exists('/folder/file')).toBe(true);
            expect(await exists('/folder/not-a-file')).toBe(false);
            expect(await exists('/f.html')).toBe(true);
            expect(await exists('/empty-folder')).toBe(true);
            expect(await exists('/')).toBe(true);
            expect(await exists('/asdf')).toBe(false);
            expect(await exists('asdf')).toBe(false);
        });
    });
    describe('.access()', () => {
        describe('files', () => {
            test('succeeds on file existence check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder/file', 0 /* AMODE.F_OK */);
            });
            test('succeeds on file "read" check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder/file', 4 /* AMODE.R_OK */);
            });
            test('succeeds on file "write" check, on writable file system', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder/file', 2 /* AMODE.W_OK */);
            });
            test('fails on file "write" check, on read-only file system', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' }, 'read');
                try {
                    await fs.promises.access('/folder/file', 2 /* AMODE.W_OK */);
                    throw new Error('should not be here');
                }
                catch (error) {
                    expect(error.code).toBe('EACCESS');
                }
            });
            test('fails on file "execute" check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                try {
                    await fs.promises.access('/folder/file', 1 /* AMODE.X_OK */);
                    throw new Error('should not be here');
                }
                catch (error) {
                    expect(error.code).toBe('EACCESS');
                }
            });
        });
        describe('directories', () => {
            test('succeeds on folder existence check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder', 0 /* AMODE.F_OK */);
            });
            test('succeeds on folder "read" check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder', 4 /* AMODE.R_OK */);
            });
            test('succeeds on folder "write" check, on writable file system', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                await fs.promises.access('/folder', 2 /* AMODE.W_OK */);
            });
            test('fails on folder "write" check, on read-only file system', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' }, 'read');
                try {
                    await fs.promises.access('/folder', 2 /* AMODE.W_OK */);
                    throw new Error('should not be here');
                }
                catch (error) {
                    expect(error.code).toBe('EACCESS');
                }
            });
            test('fails on folder "execute" check', async () => {
                const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
                try {
                    await fs.promises.access('/folder', 1 /* AMODE.X_OK */);
                    throw new Error('should not be here');
                }
                catch (error) {
                    expect(error.code).toBe('EACCESS');
                }
            });
        });
    });
    describe('.rename()', () => {
        test('can rename a file', async () => {
            const { fs, mfs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            await fs.promises.rename('/folder/file', '/folder/file2');
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file2': 'test',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
    });
    describe('.stat()', () => {
        test('can stat a file', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.stat('/folder/file');
            expect(stats.isFile()).toBe(true);
        });
        test('throws "ENOENT" when path is not found', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const [, error] = await (0, thingies_1.of)(fs.promises.stat('/folder/repo/.git'));
            expect(error.code).toBe('ENOENT');
        });
        test('throws "ENOTDIR" when sub-folder is a file', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const [, error] = await (0, thingies_1.of)(fs.promises.stat('/folder/file/repo/.git'));
            expect(error.code).toBe('ENOTDIR');
        });
        test('can retrieve file size', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.stat('/folder/file');
            expect(stats.size).toBe(4);
        });
        test('can stat a folder', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.stat('/folder');
            expect(stats.isFile()).toBe(false);
            expect(stats.isDirectory()).toBe(true);
        });
        test('throws on non-existing path', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            try {
                const stats = await fs.promises.stat('/folder/abc');
                throw new Error('should not be here');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
            }
        });
    });
    describe('.lstat()', () => {
        test('can stat a file', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.lstat('/folder/file');
            expect(stats.isFile()).toBe(true);
        });
        test('can retrieve file size', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.lstat('/folder/file');
            expect(stats.size).toBe(4);
        });
        test('can stat a folder', async () => {
            const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stats = await fs.promises.lstat('/folder');
            expect(stats.isFile()).toBe(false);
            expect(stats.isDirectory()).toBe(true);
        });
        test('throws on non-existing path', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            try {
                await fs.promises.lstat('/folder/abc');
                throw new Error('should not be here');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
            }
        });
    });
    describe('.fstat()', () => {
        test('can stat a file', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'r');
            const stats = await new Promise((resolve, reject) => {
                fs.fstat(handle.fd, (error, stats) => {
                    if (error)
                        reject(error);
                    else
                        resolve(stats);
                });
            });
            expect(stats.isFile()).toBe(true);
        });
    });
    describe('.realpath()', () => {
        test('returns file path', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const path = await fs.promises.realpath('folder/file');
            expect(path).toBe('/folder/file');
        });
    });
    describe('.realpathSync()', () => {
        test('returns file path', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const path = fs.realpathSync('folder/file');
            expect(path).toBe('/folder/file');
        });
    });
    describe('.copyFile()', () => {
        test('can copy a file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            await fs.promises.copyFile('/folder/file', '/folder/file2');
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'test',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
    });
    describe('.writeFile()', () => {
        test('can create a new file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const res = await new Promise((resolve, reject) => {
                fs.writeFile('/folder/foo', 'bar', error => {
                    if (error)
                        reject(error);
                    else
                        resolve();
                });
            });
            expect(res).toBe(undefined);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/foo': 'bar',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('throws "EEXIST", if file already exists and O_EXCL flag set', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const [, err] = await (0, thingies_1.of)(fs.promises.writeFile('/folder/file', 'bar', { flag: 'wx' }));
            expect(err).toBeInstanceOf(Error);
            expect(err.code).toBe('EEXIST');
        });
        test('throws "ENOENT", if file does not exist and O_CREAT flag not set', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const [, err] = await (0, thingies_1.of)(fs.promises.writeFile('/folder/file2', 'bar', { flag: 2 /* FLAG.O_RDWR */ }));
            expect(err).toBeInstanceOf(Error);
            expect(err.code).toBe('ENOENT');
        });
    });
    describe('.read()', () => {
        test('can read from a file at offset into Buffer', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'r');
            const [buffer, length] = await new Promise((resolve, reject) => {
                const buffer = Buffer.alloc(4);
                fs.read(handle.fd, buffer, 0, 2, 1, (error, bytesRead, buffer) => {
                    if (error)
                        reject(error);
                    else
                        resolve([buffer, bytesRead]);
                });
            });
            expect(length).toBe(2);
            expect(buffer.slice(0, 2).toString()).toBe('es');
        });
        test('can read from a file at offset into Uint8Array', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'r');
            const [buffer, length] = await new Promise((resolve, reject) => {
                const buffer = new Uint8Array(4);
                fs.read(handle.fd, buffer, 0, 2, 1, (error, bytesRead, buffer) => {
                    if (error)
                        reject(error);
                    else
                        resolve([buffer, bytesRead]);
                });
            });
            expect(length).toBe(2);
            expect(buffer[0]).toBe(101);
            expect(buffer[1]).toBe(115);
        });
    });
    describe('.createWriteStream()', () => {
        test('can use stream to write to a new file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stream = fs.createWriteStream('/folder/file2');
            stream.write(Buffer.from('A'));
            stream.write(Buffer.from('BC'));
            stream.write(Buffer.from('DEF'));
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(6);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'ABCDEF',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('can use stream to write to a new file using strings', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stream = fs.createWriteStream('/folder/file2');
            stream.write('A');
            stream.write('BC');
            stream.write('DEF');
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(6);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'ABCDEF',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('can use stream to overwrite existing file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stream = fs.createWriteStream('/folder/file');
            stream.write(Buffer.from('A'));
            stream.write(Buffer.from('BC'));
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(3);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'ABC',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('can write by file descriptor', async () => {
            const { fs, mfs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'a');
            const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a' });
            stream.write(Buffer.from('BC'));
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(2);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'tBCt',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('closes file once stream ends', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'a');
            const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a' });
            stream.write(Buffer.from('BC'));
            const stat = async () => await new Promise((resolve, reject) => fs.fstat(handle.fd, (err, stats) => {
                if (err)
                    reject(err);
                else
                    resolve(stats);
            }));
            await stat();
            stream.end();
            await (0, thingies_1.until)(async () => {
                const [, error] = await (0, thingies_1.of)(stat());
                return !!error;
            });
            const [, error] = await (0, thingies_1.of)(stat());
            expect(error.code).toBe('EBADF');
        });
        test('does not close file if "autoClose" is false', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file', 'a');
            const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a', autoClose: false });
            stream.write(Buffer.from('BC'));
            const stat = async () => await new Promise((resolve, reject) => fs.fstat(handle.fd, (err, stats) => {
                if (err)
                    reject(err);
                else
                    resolve(stats);
            }));
            await stat();
            stream.end();
            await (0, thingies_1.tick)(200);
            await stat();
        });
        test('can use stream to add to existing file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stream = fs.createWriteStream('/folder/file', { flags: 'a' });
            stream.write(Buffer.from('A'));
            stream.write(Buffer.from('BC'));
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(3);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'ABCt',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('can use stream to add to existing file at specified offset', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const stream = fs.createWriteStream('/folder/file', { flags: 'a', start: 1 });
            stream.write(Buffer.from('A'));
            stream.write(Buffer.from('B'));
            stream.end();
            await new Promise(resolve => stream.once('close', resolve));
            expect(stream.bytesWritten).toBe(2);
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'tABt',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('throws if "start" option is not a number', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            try {
                fs.createWriteStream('/folder/file', { flags: 'a', start: '1' });
                throw new Error('should have thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(TypeError);
                expect(error.message).toBe('"start" option must be a Number');
            }
        });
        test('throws if "start" option is negative', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            try {
                fs.createWriteStream('/folder/file', { flags: 'a', start: -1 });
                throw new Error('should have thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(TypeError);
                expect(error.message).toBe('"start" must be >= zero');
            }
        });
    });
    describe('.createReadStream()', () => {
        test('can pipe fs.ReadStream to fs.WriteStream', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const readStream = fs.createReadStream('/folder/file');
            const writeStream = fs.createWriteStream('/folder/file2');
            readStream.pipe(writeStream);
            await new Promise(resolve => writeStream.once('close', resolve));
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'test',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('emits "open" event', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const readStream = fs.createReadStream('/folder/file');
            const fd = await new Promise(resolve => readStream.once('open', resolve));
            expect(typeof fd).toBe('number');
        });
        test('emits "ready" event', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const readStream = fs.createReadStream('/folder/file');
            await new Promise(resolve => readStream.once('ready', resolve));
        });
        test('emits "close" event', async () => {
            const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const readStream = fs.createReadStream('/folder/file', { emitClose: true });
            const writeStream = fs.createWriteStream('/folder/file2');
            readStream.pipe(writeStream);
            await new Promise(resolve => readStream.once('close', resolve));
        });
        test('can write to already open file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const handle = await fs.promises.open('/folder/file');
            const readStream = fs.createReadStream('xyz', { fd: handle.fd });
            const writeStream = fs.createWriteStream('/folder/file2');
            readStream.pipe(writeStream);
            await new Promise(resolve => writeStream.once('close', resolve));
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'test',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
        test('can read a specified slice of a file', async () => {
            const { fs, vol } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
            const readStream = fs.createReadStream('/folder/file', { start: 1, end: 2 });
            const writeStream = fs.createWriteStream('/folder/file2');
            readStream.pipe(writeStream);
            await new Promise(resolve => writeStream.once('close', resolve));
            expect(vol.toJSON()).toStrictEqual({
                '/mountpoint/folder/file': 'test',
                '/mountpoint/folder/file2': 'es',
                '/mountpoint/empty-folder': null,
                '/mountpoint/f.html': 'test',
            });
        });
    });
});
//# sourceMappingURL=FsaNodeFs.test.js.map