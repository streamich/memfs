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
      expect(permission.state).toBe('granted');
      expect(permission.name).toBe('read');
    });

    test('grants readwrite permission for files when context allows', async () => {
      const { dir } = setup({
        'test.txt': 'content',
      });
      const file = await dir.getFileHandle('test.txt');
      const permission = await file.queryPermission({ mode: 'readwrite' });
      expect(permission.state).toBe('granted');
      expect(permission.name).toBe('readwrite');
    });

    test('grants read permission for existing directories', async () => {
      const { dir } = setup({
        subdir: null,
      });
      const subdir = await dir.getDirectoryHandle('subdir');
      const permission = await subdir.queryPermission({ mode: 'read' });
      expect(permission.state).toBe('granted');
      expect(permission.name).toBe('read');
    });

    test('denies permission for non-existent paths', async () => {
      const { fs } = setup();
      const nonExistentFile = new (await import('../NodeFileSystemFileHandle')).NodeFileSystemFileHandle(
        fs as any,
        '/nonexistent.txt',
        { mode: 'readwrite' },
      );
      const permission = await nonExistentFile.queryPermission({ mode: 'read' });
      expect(permission.state).toBe('denied');
      expect(permission.name).toBe('read');
    });
  });
});
