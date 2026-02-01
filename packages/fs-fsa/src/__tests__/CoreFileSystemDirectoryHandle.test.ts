import { Superblock, DirectoryJSON } from '@jsonjoy.com/fs-core';
import { CoreFileSystemDirectoryHandle } from '../CoreFileSystemDirectoryHandle';
import { CoreFileSystemFileHandle } from '../CoreFileSystemFileHandle';
import { CoreFileSystemHandle } from '../CoreFileSystemHandle';
import { onlyOnNode20 } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const core = Superblock.fromJSON(json, { cwd: '/' });
  const dir = new CoreFileSystemDirectoryHandle(core, '/', { mode: 'readwrite' });
  return { dir, core };
};

onlyOnNode20('CoreFileSystemDirectoryHandle', () => {
  test('can instantiate', () => {
    const { dir } = setup();
    expect(dir).toBeInstanceOf(CoreFileSystemDirectoryHandle);
  });

  describe('.keys()', () => {
    test('returns an empty iterator for an empty directory', async () => {
      const { dir } = setup();
      const keys = dir.keys();
      expect(await keys.next()).toStrictEqual({ done: true, value: undefined });
    });

    test('returns a folder', async () => {
      const { dir } = setup({ folder: null });
      const list: string[] = [];
      for await (const key of dir.keys()) list.push(key);
      expect(list).toStrictEqual(['folder']);
    });

    test('returns two folders', async () => {
      const { dir } = setup({
        folder: null,
        'another/folder': null,
      });
      const list: string[] = [];
      for await (const key of dir.keys()) list.push(key);
      expect(list.length).toBe(2);
    });

    test('returns a file', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const list: string[] = [];
      for await (const key of dir.keys()) list.push(key);
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
      const { dir } = setup({ 'My Documents': null });
      for await (const [name, subdir] of dir.entries()) {
        expect(name).toBe('My Documents');
        expect(subdir).toBeInstanceOf(CoreFileSystemDirectoryHandle);
        expect(subdir.kind).toBe('directory');
        expect(subdir.name).toBe('My Documents');
        expect((subdir as CoreFileSystemDirectoryHandle).__path).toBe('/My Documents/');
      }
    });

    test('returns a file', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      for await (const [name, file] of dir.entries()) {
        expect(name).toBe('file.txt');
        expect(file).toBeInstanceOf(CoreFileSystemFileHandle);
        expect(file.kind).toBe('file');
        expect(file.name).toBe('file.txt');
        await expect((file as CoreFileSystemFileHandle).getFile()).resolves.toBeInstanceOf(File);
      }
    });

    test('returns two entries', async () => {
      const { dir } = setup({
        'index.html': '<nobr>Hello, world!</nobr>',
        'another/folder': null,
      });
      const handles: CoreFileSystemHandle[] = [];
      for await (const entry of dir.entries()) handles.push(entry[1]);
      expect(handles.length).toBe(2);
      expect(handles.find(handle => handle.name === 'index.html')).toBeInstanceOf(CoreFileSystemFileHandle);
      expect(handles.find(handle => handle.name === 'another')).toBeInstanceOf(CoreFileSystemDirectoryHandle);
    });
  });

  describe('.values()', () => {
    test('returns an empty iterator for an empty directory', async () => {
      const { dir } = setup();
      const values = dir.values();
      expect(await values.next()).toStrictEqual({ done: true, value: undefined });
    });
  });

  describe('.getDirectoryHandle()', () => {
    test('can get directory that exists', async () => {
      const { dir } = setup({ folder: null });
      const subdir = await dir.getDirectoryHandle('folder');
      expect(subdir).toBeInstanceOf(CoreFileSystemDirectoryHandle);
      expect(subdir.name).toBe('folder');
    });

    test('can create new directory', async () => {
      const { dir } = setup();
      const subdir = await dir.getDirectoryHandle('new-folder', { create: true });
      expect(subdir).toBeInstanceOf(CoreFileSystemDirectoryHandle);
      expect(subdir.name).toBe('new-folder');
    });

    test('throws error when directory does not exist and create is false', async () => {
      const { dir } = setup();
      await expect(dir.getDirectoryHandle('nonexistent')).rejects.toThrow(
        'A requested file or directory could not be found',
      );
    });
  });

  describe('.getFileHandle()', () => {
    test('can get file that exists', async () => {
      const { dir } = setup({ 'test.txt': 'content' });
      const file = await dir.getFileHandle('test.txt');
      expect(file).toBeInstanceOf(CoreFileSystemFileHandle);
      expect(file.name).toBe('test.txt');
    });

    test('can create new file', async () => {
      const { dir } = setup();
      const file = await dir.getFileHandle('new-file.txt', { create: true });
      expect(file).toBeInstanceOf(CoreFileSystemFileHandle);
      expect(file.name).toBe('new-file.txt');
    });

    test('throws error when file does not exist and create is false', async () => {
      const { dir } = setup();
      await expect(dir.getFileHandle('nonexistent.txt')).rejects.toThrow(
        'A requested file or directory could not be found',
      );
    });
  });

  describe('.removeEntry()', () => {
    test('can remove a file', async () => {
      const { dir } = setup({ 'test.txt': 'content' });
      await dir.removeEntry('test.txt');
      await expect(dir.getFileHandle('test.txt')).rejects.toThrow('A requested file or directory could not be found');
    });

    test('can remove an empty directory', async () => {
      const { dir } = setup({ folder: null });
      await dir.removeEntry('folder');
      await expect(dir.getDirectoryHandle('folder')).rejects.toThrow(
        'A requested file or directory could not be found',
      );
    });

    test('can remove directory recursively', async () => {
      const { dir } = setup({ 'folder/file.txt': 'content' });
      await dir.removeEntry('folder', { recursive: true });
      await expect(dir.getDirectoryHandle('folder')).rejects.toThrow(
        'A requested file or directory could not be found',
      );
    });
  });

  describe('.resolve()', () => {
    test('can resolve direct child', async () => {
      const { dir } = setup({ 'test.txt': 'content' });
      const file = await dir.getFileHandle('test.txt');
      const resolved = await dir.resolve(file);
      expect(resolved).toEqual(['test.txt']);
    });

    test('can resolve nested child', async () => {
      const { dir } = setup({ 'folder/file.txt': 'content' });
      const subdir = await dir.getDirectoryHandle('folder');
      const file = await subdir.getFileHandle('file.txt');
      const resolved = await dir.resolve(file);
      expect(resolved).toEqual(['folder', 'file.txt']);
    });

    test('returns null for non-descendant', async () => {
      const { dir: dir1 } = setup({ 'file1.txt': 'content' });

      // Create completely different core and root path
      const core2 = Superblock.fromJSON({ 'different/file2.txt': 'content' }, { cwd: '/' });
      // Use a different path that does not start with dir1's path
      const dir2 = new CoreFileSystemDirectoryHandle(core2, '/some-completely-different-path/', { mode: 'readwrite' });

      // This will try to get file2.txt from /some-completely-different-path/ which doesn't exist
      // So we need to actually create the file in the expected location
      const actualDir2 = new CoreFileSystemDirectoryHandle(core2, '/different/', { mode: 'readwrite' });
      const file2 = await actualDir2.getFileHandle('file2.txt');

      const resolved = await dir1.resolve(file2);
      expect(resolved).toBeNull();
    });
  });
});
