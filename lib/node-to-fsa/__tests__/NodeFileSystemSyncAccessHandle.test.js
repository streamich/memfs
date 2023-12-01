"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const NodeFileSystemDirectoryHandle_1 = require("../NodeFileSystemDirectoryHandle");
const NodeFileSystemSyncAccessHandle_1 = require("../NodeFileSystemSyncAccessHandle");
const util_1 = require("../../__tests__/util");
const setup = (json = {}) => {
    const { fs } = (0, __1.memfs)(json, '/');
    const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { syncHandleAllowed: true, mode: 'readwrite' });
    return { dir, fs };
};
(0, util_1.onlyOnNode20)('NodeFileSystemSyncAccessHandle', () => {
    describe('.close()', () => {
        test('can close the file', async () => {
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            expect(sync).toBeInstanceOf(NodeFileSystemSyncAccessHandle_1.NodeFileSystemSyncAccessHandle);
            await sync.close();
            // ...
        });
    });
    describe('.flush()', () => {
        test('can flush', async () => {
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            await sync.flush();
        });
    });
    describe('.getSize()', () => {
        test('can get file size', async () => {
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const size = await sync.getSize();
            expect(size).toBe(13);
        });
    });
    describe('.getSize()', () => {
        test('can get file size', async () => {
            const { dir } = setup({
                'file.txt': 'Hello, world!',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const size = await sync.getSize();
            expect(size).toBe(13);
        });
    });
    describe('.read()', () => {
        test('can read from beginning', async () => {
            const { dir } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const buf = new Uint8Array(5);
            const size = await sync.read(buf);
            expect(size).toBe(5);
            expect(Buffer.from(buf).toString()).toBe('01234');
        });
        test('can read at offset', async () => {
            const { dir } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const buf = new Uint8Array(3);
            const size = await sync.read(buf, { at: 3 });
            expect(size).toBe(3);
            expect(Buffer.from(buf).toString()).toBe('345');
        });
        test('can read into buffer larger than file', async () => {
            const { dir } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const buf = new Uint8Array(25);
            const size = await sync.read(buf);
            expect(size).toBe(10);
            expect(Buffer.from(buf).slice(0, 10).toString()).toBe('0123456789');
        });
        test('throws "InvalidStateError" DOMException if handle is closed', async () => {
            const { dir } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            await sync.close();
            const buf = new Uint8Array(25);
            try {
                const size = await sync.read(buf);
                throw new Error('No error was thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('InvalidStateError');
            }
        });
    });
    describe('.truncate()', () => {
        test('can read from beginning', async () => {
            const { dir } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const res = await sync.truncate(5);
            expect(res).toBe(undefined);
        });
    });
    describe('.write()', () => {
        test('can write to the file', async () => {
            const { dir, fs } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const res = await sync.write(Buffer.from('Hello'));
            expect(res).toBe(5);
            expect(fs.readFileSync('/file.txt', 'utf8')).toBe('Hello56789');
        });
        test('can write at an offset', async () => {
            const { dir, fs } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            const res = await sync.write(Buffer.from('Hello'), { at: 7 });
            expect(res).toBe(5);
            expect(fs.readFileSync('/file.txt', 'utf8')).toBe('0123456Hello');
        });
        test('throws "InvalidStateError" DOMException if file descriptor is already closed', async () => {
            const { dir, fs } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            await sync.write(Buffer.from('a'));
            await sync.close();
            try {
                await sync.write(Buffer.from('b'));
                throw new Error('No error was thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(DOMException);
                expect(error.name).toBe('InvalidStateError');
            }
        });
        // TODO: Need to find out what is the correct behavior here.
        xtest('writing at offset past file size', async () => {
            const { dir, fs } = setup({
                'file.txt': '0123456789',
            });
            const entry = await dir.getFileHandle('file.txt');
            const sync = await entry.createSyncAccessHandle();
            try {
                await sync.write(Buffer.from('a'), { at: 100 });
                // ?
            }
            catch (error) {
                // ?
            }
        });
    });
});
//# sourceMappingURL=NodeFileSystemSyncAccessHandle.test.js.map