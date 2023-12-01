"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const json = require("../json");
const data = {
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
};
test('snapshot is a valid JSON', () => {
    const { fs } = (0, __1.memfs)(data);
    fs.symlinkSync('/start/folder1/folder2/file6', '/start/folder1/symlink');
    fs.writeFileSync('/start/binary', new Uint8Array([1, 2, 3]));
    const snapshot = json.toJsonSnapshotSync({ fs, path: '/start' });
    const pojo = JSON.parse(Buffer.from(snapshot).toString());
    expect(Array.isArray(pojo)).toBe(true);
    expect(pojo[0]).toBe(0 /* SnapshotNodeType.Folder */);
});
test('sync and async snapshots are equivalent', async () => {
    const { fs } = (0, __1.memfs)(data);
    fs.symlinkSync('/start/folder1/folder2/file6', '/start/folder1/symlink');
    fs.writeFileSync('/start/binary', new Uint8Array([1, 2, 3]));
    const snapshot1 = await json.toJsonSnapshotSync({ fs: fs, path: '/start' });
    const snapshot2 = await json.toJsonSnapshot({ fs: fs.promises, path: '/start' });
    expect(snapshot1).toStrictEqual(snapshot2);
});
describe('synchronous', () => {
    test('can create a binary snapshot and un-snapshot it back', () => {
        const { fs } = (0, __1.memfs)(data);
        fs.symlinkSync('/start/folder1/folder2/file6', '/start/folder1/symlink');
        fs.writeFileSync('/start/binary', new Uint8Array([1, 2, 3]));
        const snapshot = json.toJsonSnapshotSync({ fs, path: '/start' });
        const { fs: fs2, vol: vol2 } = (0, __1.memfs)();
        fs2.mkdirSync('/start', { recursive: true });
        json.fromJsonSnapshotSync(snapshot, { fs: fs2, path: '/start' });
        expect(fs2.readFileSync('/start/binary')).toStrictEqual(Buffer.from([1, 2, 3]));
        const snapshot2 = json.toJsonSnapshotSync({ fs: fs2, path: '/start' });
        expect(snapshot2).toStrictEqual(snapshot);
    });
});
describe('asynchronous', () => {
    test('can create a binary snapshot and un-snapshot it back', async () => {
        const { fs } = (0, __1.memfs)(data);
        fs.symlinkSync('/start/folder1/folder2/file6', '/start/folder1/symlink');
        fs.writeFileSync('/start/binary', new Uint8Array([1, 2, 3]));
        const snapshot = await json.toJsonSnapshot({ fs: fs.promises, path: '/start' });
        const { fs: fs2, vol: vol2 } = (0, __1.memfs)();
        fs2.mkdirSync('/start', { recursive: true });
        await json.fromJsonSnapshot(snapshot, { fs: fs2.promises, path: '/start' });
        expect(fs2.readFileSync('/start/binary')).toStrictEqual(Buffer.from([1, 2, 3]));
        const snapshot2 = await json.toJsonSnapshot({ fs: fs2.promises, path: '/start' });
        expect(snapshot2).toStrictEqual(snapshot);
    });
});
//# sourceMappingURL=json.test.js.map