"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = require("../async");
const __1 = require("../..");
test('can snapshot a single file', async () => {
    const { fs } = (0, __1.memfs)({
        '/foo': 'bar',
    });
    const snapshot = await (0, async_1.toSnapshot)({ fs: fs.promises, path: '/foo' });
    expect(snapshot).toStrictEqual([1 /* SnapshotNodeType.File */, expect.any(Object), new Uint8Array([98, 97, 114])]);
});
test('can snapshot a single folder', async () => {
    const { fs } = (0, __1.memfs)({
        '/foo': null,
    });
    const snapshot = await (0, async_1.toSnapshot)({ fs: fs.promises, path: '/foo' });
    expect(snapshot).toStrictEqual([0 /* SnapshotNodeType.Folder */, expect.any(Object), {}]);
});
test('can snapshot a folder with a file and symlink', async () => {
    const { fs } = (0, __1.memfs)({
        '/foo': 'bar',
    });
    fs.symlinkSync('/foo', '/baz');
    const snapshot = await (0, async_1.toSnapshot)({ fs: fs.promises, path: '/' });
    expect(snapshot).toStrictEqual([
        0 /* SnapshotNodeType.Folder */,
        expect.any(Object),
        {
            foo: [1 /* SnapshotNodeType.File */, expect.any(Object), new Uint8Array([98, 97, 114])],
            baz: [2 /* SnapshotNodeType.Symlink */, { target: '/foo' }],
        },
    ]);
});
test('can create a snapshot and un-snapshot a complex fs tree', async () => {
    const { fs } = (0, __1.memfs)({
        '/start': {
            file1: 'file1',
            file2: 'file2',
            'empty-folder': null,
            '/folder1': {
                file3: 'file3',
                file4: 'file4',
                'empty-folder': null,
                '/folder2': {
                    file5: 'file5',
                    file6: 'file6',
                    'empty-folder': null,
                    'empty-folde2': null,
                },
            },
        },
    });
    fs.symlinkSync('/start/folder1/folder2/file6', '/start/folder1/symlink');
    fs.writeFileSync('/start/binary', new Uint8Array([1, 2, 3]));
    const snapshot = await (0, async_1.toSnapshot)({ fs: fs.promises, path: '/start' });
    const { fs: fs2, vol: vol2 } = (0, __1.memfs)();
    fs2.mkdirSync('/start', { recursive: true });
    await (0, async_1.fromSnapshot)(snapshot, { fs: fs2.promises, path: '/start' });
    expect(fs2.readFileSync('/start/binary')).toStrictEqual(Buffer.from([1, 2, 3]));
    const snapshot2 = await (0, async_1.toSnapshot)({ fs: fs2.promises, path: '/start' });
    expect(snapshot2).toStrictEqual(snapshot);
});
//# sourceMappingURL=async.test.js.map