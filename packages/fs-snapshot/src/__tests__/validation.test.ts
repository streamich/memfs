import * as nodeFs from 'fs';
import * as os from 'os';
import * as nodePath from 'path';
import { JsonEncoder } from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import { CborEncoder } from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import { Writer } from '@jsonjoy.com/buffers/lib/Writer';
import { fromSnapshotSync } from '../sync';
import { fromSnapshot } from '../async';
import { fromJsonSnapshotSync, fromJsonSnapshot } from '../json';
import { fromBinarySnapshotSync, fromBinarySnapshot } from '../binary';
import { validateEntryName } from '../shared';
import { SnapshotNodeType } from '../constants';
import { createMockFs } from './testUtils';
import type { SnapshotNode } from '../types';

// A folder snapshot whose entry name walks out of the restore root.
const traversalSnapshot = (): SnapshotNode =>
  [
    SnapshotNodeType.Folder,
    {},
    {
      'inside.txt': [SnapshotNodeType.File, {}, new Uint8Array([1])],
      '../escaped.txt': [SnapshotNodeType.File, {}, new Uint8Array([2])],
    },
  ] as SnapshotNode;

const jsonEncoder = new JsonEncoder(new Writer(1024));
const cborEncoder = new CborEncoder(new Writer(1024));

describe('assertSnapshotEntryName', () => {
  test.each(['..', '.', '', 'foo/bar', 'foo\\bar', '../escaped.txt', '..\\escaped.txt', 'a/../../b'])(
    'rejects %j',
    name => {
      expect(() => validateEntryName(name)).toThrow(/Invalid snapshot entry name/);
    },
  );

  test.each(['file.txt', 'foo', '.hidden', '..foo', 'foo..bar', 'name with spaces', '🚀'])('accepts %j', name => {
    expect(() => validateEntryName(name)).not.toThrow();
  });
});

describe('path traversal during restore (real fs, temp dir)', () => {
  test('fromSnapshotSync rejects a "../" entry name and writes nothing outside the root', () => {
    const tmp = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'memfs-sec-'));
    try {
      const restoreRoot = nodePath.join(tmp, 'root');
      const escaped = nodePath.join(tmp, 'escaped.txt');
      expect(() => fromSnapshotSync(traversalSnapshot(), { fs: nodeFs as any, path: restoreRoot })).toThrow(
        /Invalid snapshot entry name/,
      );
      expect(nodeFs.existsSync(escaped)).toBe(false);
    } finally {
      nodeFs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('fromSnapshot rejects a "../" entry name and writes nothing outside the root', async () => {
    const tmp = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'memfs-sec-'));
    try {
      const restoreRoot = nodePath.join(tmp, 'root');
      const escaped = nodePath.join(tmp, 'escaped.txt');
      await expect(
        fromSnapshot(traversalSnapshot(), { fs: nodeFs.promises as any, path: restoreRoot }),
      ).rejects.toThrow(/Invalid snapshot entry name/);
      expect(nodeFs.existsSync(escaped)).toBe(false);
    } finally {
      nodeFs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('separator and dot entry names are rejected (mock fs)', () => {
  const cases: { name: string; entry: string }[] = [
    { name: 'parent traversal', entry: '../escaped.txt' },
    { name: 'forward-slash nested', entry: 'nested/file.txt' },
    { name: 'back-slash nested', entry: 'nested\\file.txt' },
    { name: 'single dot', entry: '.' },
    { name: 'double dot', entry: '..' },
  ];

  test.each(cases)('sync rejects $name', ({ entry }) => {
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    const snapshot = [SnapshotNodeType.Folder, {}, { [entry]: [SnapshotNodeType.File, {}, new Uint8Array([1])] }];
    expect(() => fromSnapshotSync(snapshot as SnapshotNode, { fs, path: '/restore' })).toThrow(
      /Invalid snapshot entry name/,
    );
  });

  test.each(cases)('async rejects $name', async ({ entry }) => {
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    const snapshot = [SnapshotNodeType.Folder, {}, { [entry]: [SnapshotNodeType.File, {}, new Uint8Array([1])] }];
    await expect(fromSnapshot(snapshot as SnapshotNode, { fs: fs.promises, path: '/restore' })).rejects.toThrow(
      /Invalid snapshot entry name/,
    );
  });
});

describe('encoded restore wrappers inherit the protection', () => {
  test('fromJsonSnapshotSync rejects a traversal entry name', () => {
    const bytes = jsonEncoder.encode(traversalSnapshot()) as any;
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    expect(() => fromJsonSnapshotSync(bytes, { fs, path: '/restore' })).toThrow(/Invalid snapshot entry name/);
  });

  test('fromJsonSnapshot rejects a traversal entry name', async () => {
    const bytes = jsonEncoder.encode(traversalSnapshot()) as any;
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    await expect(fromJsonSnapshot(bytes, { fs: fs.promises, path: '/restore' })).rejects.toThrow(
      /Invalid snapshot entry name/,
    );
  });

  test('fromBinarySnapshotSync rejects a traversal entry name', () => {
    const bytes = cborEncoder.encode(traversalSnapshot()) as any;
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    expect(() => fromBinarySnapshotSync(bytes, { fs, path: '/restore' })).toThrow(/Invalid snapshot entry name/);
  });

  test('fromBinarySnapshot rejects a traversal entry name', async () => {
    const bytes = cborEncoder.encode(traversalSnapshot()) as any;
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    await expect(fromBinarySnapshot(bytes, { fs: fs.promises, path: '/restore' })).rejects.toThrow(
      /Invalid snapshot entry name/,
    );
  });
});

describe('legitimate snapshots still restore (no regression)', () => {
  const valid = (): SnapshotNode =>
    [
      SnapshotNodeType.Folder,
      {},
      {
        'file.txt': [SnapshotNodeType.File, {}, new Uint8Array([1, 2, 3])],
        '.hidden': [SnapshotNodeType.File, {}, new Uint8Array([4])],
        '..foo': [SnapshotNodeType.File, {}, new Uint8Array([5])],
        sub: [SnapshotNodeType.Folder, {}, { 'nested.txt': [SnapshotNodeType.File, {}, new Uint8Array([9])] }],
      },
    ] as SnapshotNode;

  test('sync restores valid entry names', () => {
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    fromSnapshotSync(valid(), { fs, path: '/restore' });
    expect(fs.readFileSync('/restore/file.txt')).toStrictEqual(Buffer.from([1, 2, 3]));
    expect(fs.readFileSync('/restore/.hidden')).toStrictEqual(Buffer.from([4]));
    expect(fs.readFileSync('/restore/..foo')).toStrictEqual(Buffer.from([5]));
    expect(fs.readFileSync('/restore/sub/nested.txt')).toStrictEqual(Buffer.from([9]));
  });

  test('async restores valid entry names', async () => {
    const { fs } = createMockFs();
    fs.mkdirSync('/restore', { recursive: true });
    await fromSnapshot(valid(), { fs: fs.promises, path: '/restore' });
    expect(fs.readFileSync('/restore/file.txt')).toStrictEqual(Buffer.from([1, 2, 3]));
    expect(fs.readFileSync('/restore/sub/nested.txt')).toStrictEqual(Buffer.from([9]));
  });
});
