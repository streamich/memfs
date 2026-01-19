import { toSnapshotSync, fromSnapshotSync } from '../sync';
import { memfs } from '../..';
import { SnapshotNodeType } from '../constants';

test('can snapshot a single file', () => {
  const { fs } = memfs({
    '/foo': 'bar',
  });
  const snapshot = toSnapshotSync({ fs, path: '/foo' });
  expect(snapshot).toStrictEqual([SnapshotNodeType.File, expect.any(Object), new Uint8Array([98, 97, 114])]);
});

test('can snapshot a single folder', () => {
  const { fs } = memfs({
    '/foo': null,
  });
  const snapshot = toSnapshotSync({ fs, path: '/foo' });
  expect(snapshot).toStrictEqual([SnapshotNodeType.Folder, expect.any(Object), {}]);
});

test('can snapshot a folder with a file and symlink', () => {
  const { fs } = memfs({
    '/foo': 'bar',
  });
  fs.symlinkSync('/foo', '/baz');
  const snapshot = toSnapshotSync({ fs, path: '/' });
  expect(snapshot).toStrictEqual([
    SnapshotNodeType.Folder,
    expect.any(Object),
    {
      foo: [SnapshotNodeType.File, expect.any(Object), new Uint8Array([98, 97, 114])],
      baz: [SnapshotNodeType.Symlink, { target: '/foo' }],
    },
  ]);
});

test('can create a snapshot and un-snapshot a complex fs tree', () => {
  const { fs } = memfs({
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
  const snapshot = toSnapshotSync({ fs, path: '/start' })!;
  const { fs: fs2, vol: vol2 } = memfs();
  fs2.mkdirSync('/start', { recursive: true });
  fromSnapshotSync(snapshot, { fs: fs2, path: '/start' });
  expect(fs2.readFileSync('/start/binary')).toStrictEqual(Buffer.from([1, 2, 3]));
  const snapshot2 = toSnapshotSync({ fs: fs2, path: '/start' })!;
  expect(snapshot2).toStrictEqual(snapshot);
});
