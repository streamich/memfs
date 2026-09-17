import { DirectoryJSON, memfs } from 'memfs';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { onlyOnNode20 } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const { fs } = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'readwrite' });
  return { dir, fs };
};

onlyOnNode20('NodeFileSystemHandle', () => {
  test('can instantiate', () => {
    const { dir } = setup();
    expect(dir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
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

  describe('.queryPermission()', () => {
    test('grants read permission for existing files', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      const permission = await file.queryPermission({ mode: 'read' });
      expect(permission).toBe('granted');
      expect(typeof permission).toBe('string');
    });

    test('grants readwrite permission for files when context allows', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      expect(await file.queryPermission({ mode: 'readwrite' })).toBe('granted');
    });

    test('grants read permission when called without a descriptor', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      expect(await file.queryPermission()).toBe('granted');
    });

    test('grants read permission for existing directories', async () => {
      const { dir } = setup({
        subdir: null,
      });
      const subdir = await dir.getDirectoryHandle('subdir');
      expect(await subdir.queryPermission({ mode: 'read' })).toBe('granted');
    });

    test('denies readwrite when context only allows read', async () => {
      const { fs } = setup({
        'test.txt': 'content',
      });
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      const file = await dir.getFileHandle('test.txt');
      expect(await file.queryPermission({ mode: 'read' })).toBe('granted');
      expect(await file.queryPermission({ mode: 'readwrite' })).toBe('denied');
    });

    test('denies permission for non-existent paths', async () => {
      const { fs } = setup();
      const nonExistentFile = new (await import('../NodeFileSystemFileHandle')).NodeFileSystemFileHandle(
        fs as any,
        '/nonexistent.txt',
        { mode: 'readwrite' },
      );
      expect(await nonExistentFile.queryPermission({ mode: 'read' })).toBe('denied');
    });
  });

  describe('.requestPermission()', () => {
    test('grants read permission for existing files', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      const permission = await file.requestPermission({ mode: 'read' });
      expect(permission).toBe('granted');
      expect(typeof permission).toBe('string');
    });

    test('grants readwrite permission for files when context allows', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      expect(await file.requestPermission({ mode: 'readwrite' })).toBe('granted');
      expect(await file.requestPermission()).toBe('granted');
    });

    test('denies readwrite when context only allows read', async () => {
      const { fs } = setup({
        'test.txt': 'content',
      });
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      const file = await dir.getFileHandle('test.txt');
      expect(await file.requestPermission({ mode: 'read' })).toBe('granted');
      expect(await file.requestPermission({ mode: 'readwrite' })).toBe('denied');
    });

    test('denies permission for non-existent paths', async () => {
      const { fs } = setup();
      const nonExistentFile = new (await import('../NodeFileSystemFileHandle')).NodeFileSystemFileHandle(
        fs as any,
        '/nonexistent.txt',
        { mode: 'readwrite' },
      );
      expect(await nonExistentFile.requestPermission({ mode: 'read' })).toBe('denied');
    });
  });
});
