"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __1 = require("../..");
const NodeFileSystemDirectoryHandle_1 = require("../NodeFileSystemDirectoryHandle");
const NodeFileSystemFileHandle_1 = require("../NodeFileSystemFileHandle");
const util_1 = require("../../__tests__/util");
const setup = (json = {}) => {
    const { fs } = (0, __1.memfs)(json, '/');
    const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
    return { dir, fs };
};
(0, util_1.onlyOnNode20)('NodeFileSystemDirectoryHandle', () => {
    test('can instantiate', () => {
        const { dir } = setup();
        expect(dir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
    });
    describe('.keys()', () => {
        test('returns an empty iterator for an empty directory', async () => {
            const { dir } = setup();
            const keys = dir.keys();
            expect(await keys.next()).toStrictEqual({ done: true, value: undefined });
        });
        test('returns a folder', async () => {
            var _a, e_1, _b, _c;
            const { dir } = setup({ folder: null });
            const list = [];
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.keys()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const key = _c;
                    list.push(key);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            expect(list).toStrictEqual(['folder']);
        });
        test('returns two folders', async () => {
            var _a, e_2, _b, _c;
            const { dir } = setup({
                folder: null,
                'another/folder': null,
            });
            const list = [];
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.keys()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const key = _c;
                    list.push(key);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            expect(list.length).toBe(2);
        });
        test('returns a file', async () => {
            var _a, e_3, _b, _c;
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            const list = [];
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.keys()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const key = _c;
                    list.push(key);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            expect(list).toStrictEqual(['file.txt']);
        });
    });
    describe('.entries()', () => {
        test('returns an empty iterator for an empty directory', async () => {
            const { dir } = setup();
            const keys = dir.entries();
            expect(await keys.next()).toStrictEqual({ done: true, value: undefined });
        });
        test('returns a folder', async () => {
            var _a, e_4, _b, _c;
            const { dir } = setup({ 'My Documents': null });
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.entries()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const [name, subdir] = _c;
                    expect(name).toBe('My Documents');
                    expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
                    expect(subdir.kind).toBe('directory');
                    expect(subdir.name).toBe('My Documents');
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
        });
        test('returns a file', async () => {
            var _a, e_5, _b, _c;
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.entries()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const [name, file] = _c;
                    expect(name).toBe('file.txt');
                    expect(file).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
                    expect(file.kind).toBe('file');
                    expect(file.name).toBe('file.txt');
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_5) throw e_5.error; }
            }
        });
        test('returns two entries', async () => {
            var _a, e_6, _b, _c;
            const { dir } = setup({
                'index.html': '<nobr>Hello, world!</nobr>',
                'another/folder': null,
            });
            const handles = [];
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.entries()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const entry = _c;
                    handles.push(entry[1]);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_6) throw e_6.error; }
            }
            expect(handles.length).toBe(2);
            expect(handles.find(handle => handle.name === 'index.html')).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
            expect(handles.find(handle => handle.name === 'another')).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
        });
    });
    describe('.values()', () => {
        test('returns an empty iterator for an empty directory', async () => {
            const { dir } = setup();
            const values = dir.values();
            expect(await values.next()).toStrictEqual({ done: true, value: undefined });
        });
        test('returns a folder', async () => {
            var _a, e_7, _b, _c;
            const { dir } = setup({ 'My Documents': null });
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.values()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const subdir = _c;
                    expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
                    expect(subdir.kind).toBe('directory');
                    expect(subdir.name).toBe('My Documents');
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_7) throw e_7.error; }
            }
        });
        test('returns a file', async () => {
            var _a, e_8, _b, _c;
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.values()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const file = _c;
                    expect(file).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
                    expect(file.kind).toBe('file');
                    expect(file.name).toBe('file.txt');
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_8) throw e_8.error; }
            }
        });
        test('returns two entries', async () => {
            var _a, e_9, _b, _c;
            const { dir } = setup({
                'index.html': '<nobr>Hello, world!</nobr>',
                'another/folder': null,
            });
            const handles = [];
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(dir.values()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const entry = _c;
                    handles.push(entry);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_9) throw e_9.error; }
            }
            expect(handles.length).toBe(2);
            expect(handles.find(handle => handle.name === 'index.html')).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
            expect(handles.find(handle => handle.name === 'another')).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
        });
    });
    describe('.getDirectoryHandle()', () => {
        test('throws "NotFoundError" DOMException if sub-directory not found', async () => {
            const { dir } = setup({ a: null });
            try {
                await dir.getDirectoryHandle('b');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotFoundError');
                expect(error.message).toBe('A requested file or directory could not be found at the time an operation was processed.');
            }
        });
        test('throws "TypeMismatchError" DOMException if entry is not a directory', async () => {
            const { dir } = setup({ file: 'contents' });
            try {
                await dir.getDirectoryHandle('file');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('TypeMismatchError');
                expect(error.message).toBe('The path supplied exists, but was not an entry of requested type.');
            }
        });
        test('throws if not in "readwrite" mode and attempting to create a directory', async () => {
            const { fs } = (0, __1.memfs)({}, '/');
            const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'read' });
            try {
                await dir.getDirectoryHandle('test', { create: true });
                throw new Error('Not this error');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotAllowedError');
                expect(error.message).toBe('The request is not allowed by the user agent or the platform in the current context.');
            }
        });
        const invalidNames = [
            '.',
            '..',
            '/',
            '/a',
            'a/',
            'a//b',
            'a/.',
            'a/..',
            'a/b/.',
            'a/b/..',
            '\\',
            '\\a',
            'a\\',
            'a\\\\b',
            'a\\.',
        ];
        for (const invalidName of invalidNames) {
            test(`throws on invalid file name: "${invalidName}"`, async () => {
                const { dir } = setup({ file: 'contents' });
                try {
                    await dir.getDirectoryHandle(invalidName);
                    throw new Error('Not this error.');
                }
                catch (error) {
                    expect(error).toBeInstanceOf(TypeError);
                    expect(error.message).toBe(`Failed to execute 'getDirectoryHandle' on 'FileSystemDirectoryHandle': Name is not allowed.`);
                }
            });
        }
        test('can retrieve a child directory', async () => {
            const { dir } = setup({ file: 'contents', subdir: null });
            const subdir = await dir.getDirectoryHandle('subdir');
            expect(subdir.kind).toBe('directory');
            expect(subdir.name).toBe('subdir');
            expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
        });
        test('can create a sub-directory', async () => {
            const { dir, fs } = setup({});
            expect(fs.existsSync('/subdir')).toBe(false);
            const subdir = await dir.getDirectoryHandle('subdir', { create: true });
            expect(fs.existsSync('/subdir')).toBe(true);
            expect(fs.statSync('/subdir').isDirectory()).toBe(true);
            expect(subdir.kind).toBe('directory');
            expect(subdir.name).toBe('subdir');
            expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
        });
    });
    describe('.getFileHandle()', () => {
        test('throws "NotFoundError" DOMException if file not found', async () => {
            const { dir } = setup({ a: null });
            try {
                await dir.getFileHandle('b');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotFoundError');
                expect(error.message).toBe('A requested file or directory could not be found at the time an operation was processed.');
            }
        });
        test('throws "TypeMismatchError" DOMException if entry is not a file', async () => {
            const { dir } = setup({ directory: null });
            try {
                await dir.getFileHandle('directory');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('TypeMismatchError');
                expect(error.message).toBe('The path supplied exists, but was not an entry of requested type.');
            }
        });
        test('throws if not in "readwrite" mode and attempting to create a file', async () => {
            const { fs } = (0, __1.memfs)({}, '/');
            const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'read' });
            try {
                await dir.getFileHandle('test', { create: true });
                throw new Error('Not this error');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotAllowedError');
                expect(error.message).toBe('The request is not allowed by the user agent or the platform in the current context.');
            }
        });
        const invalidNames = [
            '',
            '.',
            '..',
            '/',
            '/a',
            'a/',
            'a//b',
            'a/.',
            'a/..',
            'a/b/.',
            'a/b/..',
            '\\',
            '\\a',
            'a\\',
            'a\\\\b',
            'a\\.',
        ];
        for (const invalidName of invalidNames) {
            test(`throws on invalid file name: "${invalidName}"`, async () => {
                const { dir } = setup({ file: 'contents' });
                try {
                    await dir.getFileHandle(invalidName);
                    throw new Error('Not this error.');
                }
                catch (error) {
                    expect(error).toBeInstanceOf(TypeError);
                    expect(error.message).toBe(`Failed to execute 'getFileHandle' on 'FileSystemDirectoryHandle': Name is not allowed.`);
                }
            });
        }
        test('can retrieve a child file', async () => {
            const { dir } = setup({ file: 'contents', subdir: null });
            const subdir = await dir.getFileHandle('file');
            expect(subdir.kind).toBe('file');
            expect(subdir.name).toBe('file');
            expect(subdir).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
        });
        test('can create a file', async () => {
            const { dir, fs } = setup({});
            expect(fs.existsSync('/text.txt')).toBe(false);
            const subdir = await dir.getFileHandle('text.txt', { create: true });
            expect(fs.existsSync('/text.txt')).toBe(true);
            expect(fs.statSync('/text.txt').isFile()).toBe(true);
            expect(subdir.kind).toBe('file');
            expect(subdir.name).toBe('text.txt');
            expect(subdir).toBeInstanceOf(NodeFileSystemFileHandle_1.NodeFileSystemFileHandle);
        });
    });
    describe('.removeEntry()', () => {
        test('throws "NotFoundError" DOMException if file not found', async () => {
            const { dir } = setup({ a: null });
            try {
                await dir.removeEntry('b');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotFoundError');
                expect(error.message).toBe('A requested file or directory could not be found at the time an operation was processed.');
            }
        });
        test('throws if not in "readwrite" mode and attempting to remove a file', async () => {
            const { fs } = (0, __1.memfs)({ a: 'b' }, '/');
            const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'read' });
            try {
                await dir.removeEntry('a');
                throw new Error('Not this error');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotAllowedError');
                expect(error.message).toBe('The request is not allowed by the user agent or the platform in the current context.');
            }
        });
        test('throws if not in "readwrite" mode and attempting to remove a folder', async () => {
            const { fs } = (0, __1.memfs)({ a: null }, '/');
            const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'read' });
            try {
                await dir.removeEntry('a');
                throw new Error('Not this error');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('NotAllowedError');
                expect(error.message).toBe('The request is not allowed by the user agent or the platform in the current context.');
            }
        });
        const invalidNames = [
            '',
            '.',
            '..',
            '/',
            '/a',
            'a/',
            'a//b',
            'a/.',
            'a/..',
            'a/b/.',
            'a/b/..',
            '\\',
            '\\a',
            'a\\',
            'a\\\\b',
            'a\\.',
        ];
        for (const invalidName of invalidNames) {
            test(`throws on invalid file name: "${invalidName}"`, async () => {
                const { dir } = setup({ file: 'contents' });
                try {
                    await dir.removeEntry(invalidName);
                    throw new Error('Not this error.');
                }
                catch (error) {
                    expect(error).toBeInstanceOf(TypeError);
                    expect(error.message).toBe(`Failed to execute 'removeEntry' on 'FileSystemDirectoryHandle': Name is not allowed.`);
                }
            });
        }
        test('can delete a file', async () => {
            const { dir, fs } = setup({ file: 'contents', subdir: null });
            expect(fs.statSync('/file').isFile()).toBe(true);
            const res = await dir.removeEntry('file');
            expect(fs.existsSync('/file')).toBe(false);
            expect(res).toBe(undefined);
        });
        test('can delete a folder', async () => {
            const { dir, fs } = setup({ dir: null });
            expect(fs.statSync('/dir').isDirectory()).toBe(true);
            const res = await dir.removeEntry('dir');
            expect(fs.existsSync('/dir')).toBe(false);
            expect(res).toBe(undefined);
        });
        test('throws "InvalidModificationError" DOMException if directory has contents', async () => {
            const { dir, fs } = setup({
                'dir/file': 'contents',
            });
            expect(fs.statSync('/dir').isDirectory()).toBe(true);
            let res;
            try {
                res = await dir.removeEntry('dir');
                throw new Error('Not this error.');
            }
            catch (error) {
                expect(res).toBe(undefined);
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('InvalidModificationError');
                expect(error.message).toBe('The object can not be modified in this way.');
            }
        });
        test('can recursively delete a folder with "recursive" flag', async () => {
            const { dir, fs } = setup({
                'dir/file': 'contents',
            });
            expect(fs.statSync('/dir').isDirectory()).toBe(true);
            const res = await dir.removeEntry('dir', { recursive: true });
            expect(fs.existsSync('/dir')).toBe(false);
            expect(res).toBe(undefined);
        });
    });
    describe('.resolve()', () => {
        test('return empty array for itself', async () => {
            const { dir } = setup({});
            const res = await dir.resolve(dir);
            expect(res).toStrictEqual([]);
        });
        test('can resolve one level deep child', async () => {
            const { dir } = setup({
                file: 'contents',
            });
            const child = await dir.getFileHandle('file');
            const res = await dir.resolve(child);
            expect(res).toStrictEqual(['file']);
        });
        test('can resolve two level deep child', async () => {
            const { dir } = setup({
                'dir/file': 'contents',
            });
            const child1 = await dir.getDirectoryHandle('dir');
            const child2 = await child1.getFileHandle('file');
            const res = await dir.resolve(child2);
            expect(res).toStrictEqual(['dir', 'file']);
            const res2 = await child1.resolve(child2);
            expect(res2).toStrictEqual(['file']);
        });
        test('returns "null" if not a descendant', async () => {
            const { dir } = setup({
                'dir/file': 'contents',
            });
            const child1 = await dir.getDirectoryHandle('dir');
            const res = await child1.resolve(dir);
            expect(res).toBe(null);
        });
    });
});
//# sourceMappingURL=NodeFileSystemDirectoryHandle.test.js.map