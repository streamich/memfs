"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const NodeFileSystemDirectoryHandle_1 = require("../NodeFileSystemDirectoryHandle");
const util_1 = require("../../__tests__/util");
const setup = (json = {}) => {
    const { fs } = (0, __1.memfs)(json, '/');
    const dir = new NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
    return { dir, fs };
};
(0, util_1.onlyOnNode20)('NodeFileSystemHandle', () => {
    test('can instantiate', () => {
        const { dir } = setup();
        expect(dir).toBeInstanceOf(NodeFileSystemDirectoryHandle_1.NodeFileSystemDirectoryHandle);
    });
    describe('.isSameEntry()', () => {
        test('returns true for the same root entry', async () => {
            const { dir } = setup();
            expect(dir.isSameEntry(dir)).toBe(true);
        });
        test('returns true for two different instances of the same entry', async () => {
            const { dir } = setup({
                subdir: null,
            });
            const subdir = await dir.getDirectoryHandle('subdir');
            expect(subdir.isSameEntry(subdir)).toBe(true);
            expect(dir.isSameEntry(dir)).toBe(true);
            expect(dir.isSameEntry(subdir)).toBe(false);
            expect(subdir.isSameEntry(dir)).toBe(false);
        });
        test('returns false when comparing file with a directory', async () => {
            const { dir } = setup({
                file: 'lala',
            });
            const file = await dir.getFileHandle('file');
            expect(file.isSameEntry(dir)).toBe(false);
            expect(dir.isSameEntry(file)).toBe(false);
        });
    });
});
//# sourceMappingURL=NodeFileSystemHandle.test.js.map