"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sync_1 = require("../sync");
const __1 = require("../..");
test('can snapshot a single file', () => {
    const { fs } = (0, __1.memfs)({
        '/foo': 'bar',
    });
    const snapshot = (0, sync_1.toSnapshotSync)({ fs, path: '/foo' });
    expect(snapshot).toStrictEqual([1 /* SnapshotNodeType.File */, expect.any(Object), new Uint8Array([98, 97, 114])]);
});
test('can snapshot a single folder', () => {
    const { fs } = (0, __1.memfs)({
        '/foo': null,
    });
    const snapshot = (0, sync_1.toSnapshotSync)({ fs, path: '/foo' });
    expect(snapshot).toStrictEqual([0 /* SnapshotNodeType.Folder */, expect.any(Object), {}]);
});
test('can snapshot a folder with a file and symlink', () => {
    const { fs } = (0, __1.memfs)({
        '/foo': 'bar',
    });
    fs.symlinkSync('/foo', '/baz');
    const snapshot = (0, sync_1.toSnapshotSync)({ fs, path: '/' });
    expect(snapshot).toStrictEqual([
        0 /* SnapshotNodeType.Folder */,
        expect.any(Object),
        {
            foo: [1 /* SnapshotNodeType.File */, expect.any(Object), new Uint8Array([98, 97, 114])],
            baz: [2 /* SnapshotNodeType.Symlink */, { target: '/foo' }],
        },
    ]);
});
test('can create a snapshot and un-snapshot a complex fs tree', () => {
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
    const snapshot = (0, sync_1.toSnapshotSync)({ fs, path: '/start' });
    const { fs: fs2, vol: vol2 } = (0, __1.memfs)();
    fs2.mkdirSync('/start', { recursive: true });
    (0, sync_1.fromSnapshotSync)(snapshot, { fs: fs2, path: '/start' });
    expect(fs2.readFileSync('/start/binary')).toStrictEqual(Buffer.from([1, 2, 3]));
    const snapshot2 = (0, sync_1.toSnapshotSync)({ fs: fs2, path: '/start' });
    expect(snapshot2).toStrictEqual(snapshot);
});
//# sourceMappingURL=sync.test.js.map