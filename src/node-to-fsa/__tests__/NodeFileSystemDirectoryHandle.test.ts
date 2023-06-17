import { DirectoryJSON, memfs } from '../..';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { NodeFileSystemFileHandle } from '../NodeFileSystemFileHandle';
import { NodeFileSystemHandle } from '../NodeFileSystemHandle';
import { onlyOnNode20 } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'readwrite' });
  return { dir, fs };
};

onlyOnNode20('NodeFileSystemDirectoryHandle', () => {
  test('can instantiate', () => {
    const { dir } = setup();
    expect(dir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
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
        expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
        expect(subdir.kind).toBe('directory');
        expect(subdir.name).toBe('My Documents');
      }
    });

    test('returns a file', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      for await (const [name, file] of dir.entries()) {
        expect(name).toBe('file.txt');
        expect(file).toBeInstanceOf(NodeFileSystemFileHandle);
        expect(file.kind).toBe('file');
        expect(file.name).toBe('file.txt');
      }
    });

    test('returns two entries', async () => {
      const { dir } = setup({
        'index.html': '<nobr>Hello, world!</nobr>',
        'another/folder': null,
      });
      const handles: NodeFileSystemHandle[] = [];
      for await (const entry of dir.entries()) handles.push(entry[1]);
      expect(handles.length).toBe(2);
      expect(handles.find(handle => handle.name === 'index.html')).toBeInstanceOf(NodeFileSystemFileHandle);
      expect(handles.find(handle => handle.name === 'another')).toBeInstanceOf(NodeFileSystemDirectoryHandle);
    });
  });

  describe('.values()', () => {
    test('returns an empty iterator for an empty directory', async () => {
      const { dir } = setup();
      const values = dir.values();
      expect(await values.next()).toStrictEqual({ done: true, value: undefined });
    });

    test('returns a folder', async () => {
      const { dir } = setup({ 'My Documents': null });
      for await (const subdir of dir.values()) {
        expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
        expect(subdir.kind).toBe('directory');
        expect(subdir.name).toBe('My Documents');
      }
    });

    test('returns a file', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      for await (const file of dir.values()) {
        expect(file).toBeInstanceOf(NodeFileSystemFileHandle);
        expect(file.kind).toBe('file');
        expect(file.name).toBe('file.txt');
      }
    });

    test('returns two entries', async () => {
      const { dir } = setup({
        'index.html': '<nobr>Hello, world!</nobr>',
        'another/folder': null,
      });
      const handles: NodeFileSystemHandle[] = [];
      for await (const entry of dir.values()) handles.push(entry);
      expect(handles.length).toBe(2);
      expect(handles.find(handle => handle.name === 'index.html')).toBeInstanceOf(NodeFileSystemFileHandle);
      expect(handles.find(handle => handle.name === 'another')).toBeInstanceOf(NodeFileSystemDirectoryHandle);
    });
  });

  describe('.getDirectoryHandle()', () => {
    test('throws "NotFoundError" DOMException if sub-directory not found', async () => {
      const { dir } = setup({ a: null });
      try {
        await dir.getDirectoryHandle('b');
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe(
          'A requested file or directory could not be found at the time an operation was processed.',
        );
      }
    });

    test('throws "TypeMismatchError" DOMException if entry is not a directory', async () => {
      const { dir } = setup({ file: 'contents' });
      try {
        await dir.getDirectoryHandle('file');
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('TypeMismatchError');
        expect(error.message).toBe('The path supplied exists, but was not an entry of requested type.');
      }
    });

    test('throws if not in "readwrite" mode and attempting to create a directory', async () => {
      const fs = memfs({}, '/');
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      try {
        await dir.getDirectoryHandle('test', { create: true });
        throw new Error('Not this error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotAllowedError');
        expect(error.message).toBe(
          'The request is not allowed by the user agent or the platform in the current context.',
        );
      }
    });

    const invalidNames = [
      '.',
      '..',
      '/',
      '/a',
      'a/',
      'a//b',
      'a/.',
      'a/..',
      'a/b/.',
      'a/b/..',
      '\\',
      '\\a',
      'a\\',
      'a\\\\b',
      'a\\.',
    ];

    for (const invalidName of invalidNames) {
      test(`throws on invalid file name: "${invalidName}"`, async () => {
        const { dir } = setup({ file: 'contents' });
        try {
          await dir.getDirectoryHandle(invalidName);
          throw new Error('Not this error.');
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
          expect(error.message).toBe(
            `Failed to execute 'getDirectoryHandle' on 'FileSystemDirectoryHandle': Name is not allowed.`,
          );
        }
      });
    }

    test('can retrieve a child directory', async () => {
      const { dir } = setup({ file: 'contents', subdir: null });
      const subdir = await dir.getDirectoryHandle('subdir');
      expect(subdir.kind).toBe('directory');
      expect(subdir.name).toBe('subdir');
      expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
    });

    test('can create a sub-directory', async () => {
      const { dir, fs } = setup({});
      expect(fs.existsSync('/subdir')).toBe(false);
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      expect(fs.existsSync('/subdir')).toBe(true);
      expect(fs.statSync('/subdir').isDirectory()).toBe(true);
      expect(subdir.kind).toBe('directory');
      expect(subdir.name).toBe('subdir');
      expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
    });
  });

  describe('.getFileHandle()', () => {
    test('throws "NotFoundError" DOMException if file not found', async () => {
      const { dir } = setup({ a: null });
      try {
        await dir.getFileHandle('b');
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe(
          'A requested file or directory could not be found at the time an operation was processed.',
        );
      }
    });

    test('throws "TypeMismatchError" DOMException if entry is not a file', async () => {
      const { dir } = setup({ directory: null });
      try {
        await dir.getFileHandle('directory');
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('TypeMismatchError');
        expect(error.message).toBe('The path supplied exists, but was not an entry of requested type.');
      }
    });

    test('throws if not in "readwrite" mode and attempting to create a file', async () => {
      const fs = memfs({}, '/');
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      try {
        await dir.getFileHandle('test', { create: true });
        throw new Error('Not this error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotAllowedError');
        expect(error.message).toBe(
          'The request is not allowed by the user agent or the platform in the current context.',
        );
      }
    });

    const invalidNames = [
      '',
      '.',
      '..',
      '/',
      '/a',
      'a/',
      'a//b',
      'a/.',
      'a/..',
      'a/b/.',
      'a/b/..',
      '\\',
      '\\a',
      'a\\',
      'a\\\\b',
      'a\\.',
    ];

    for (const invalidName of invalidNames) {
      test(`throws on invalid file name: "${invalidName}"`, async () => {
        const { dir } = setup({ file: 'contents' });
        try {
          await dir.getFileHandle(invalidName);
          throw new Error('Not this error.');
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
          expect(error.message).toBe(
            `Failed to execute 'getFileHandle' on 'FileSystemDirectoryHandle': Name is not allowed.`,
          );
        }
      });
    }

    test('can retrieve a child file', async () => {
      const { dir } = setup({ file: 'contents', subdir: null });
      const subdir = await dir.getFileHandle('file');
      expect(subdir.kind).toBe('file');
      expect(subdir.name).toBe('file');
      expect(subdir).toBeInstanceOf(NodeFileSystemFileHandle);
    });

    test('can create a file', async () => {
      const { dir, fs } = setup({});
      expect(fs.existsSync('/text.txt')).toBe(false);
      const subdir = await dir.getFileHandle('text.txt', { create: true });
      expect(fs.existsSync('/text.txt')).toBe(true);
      expect(fs.statSync('/text.txt').isFile()).toBe(true);
      expect(subdir.kind).toBe('file');
      expect(subdir.name).toBe('text.txt');
      expect(subdir).toBeInstanceOf(NodeFileSystemFileHandle);
    });
  });

  describe('.removeEntry()', () => {
    test('throws "NotFoundError" DOMException if file not found', async () => {
      const { dir } = setup({ a: null });
      try {
        await dir.removeEntry('b');
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe(
          'A requested file or directory could not be found at the time an operation was processed.',
        );
      }
    });

    test('throws if not in "readwrite" mode and attempting to remove a file', async () => {
      const fs = memfs({ a: 'b' }, '/');
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      try {
        await dir.removeEntry('a');
        throw new Error('Not this error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotAllowedError');
        expect(error.message).toBe(
          'The request is not allowed by the user agent or the platform in the current context.',
        );
      }
    });

    test('throws if not in "readwrite" mode and attempting to remove a folder', async () => {
      const fs = memfs({ a: null }, '/');
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      try {
        await dir.removeEntry('a');
        throw new Error('Not this error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotAllowedError');
        expect(error.message).toBe(
          'The request is not allowed by the user agent or the platform in the current context.',
        );
      }
    });

    const invalidNames = [
      '',
      '.',
      '..',
      '/',
      '/a',
      'a/',
      'a//b',
      'a/.',
      'a/..',
      'a/b/.',
      'a/b/..',
      '\\',
      '\\a',
      'a\\',
      'a\\\\b',
      'a\\.',
    ];

    for (const invalidName of invalidNames) {
      test(`throws on invalid file name: "${invalidName}"`, async () => {
        const { dir } = setup({ file: 'contents' });
        try {
          await dir.removeEntry(invalidName);
          throw new Error('Not this error.');
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
          expect(error.message).toBe(
            `Failed to execute 'removeEntry' on 'FileSystemDirectoryHandle': Name is not allowed.`,
          );
        }
      });
    }

    test('can delete a file', async () => {
      const { dir, fs } = setup({ file: 'contents', subdir: null });
      expect(fs.statSync('/file').isFile()).toBe(true);
      const res = await dir.removeEntry('file');
      expect(fs.existsSync('/file')).toBe(false);
      expect(res).toBe(undefined);
    });

    test('can delete a folder', async () => {
      const { dir, fs } = setup({ dir: null });
      expect(fs.statSync('/dir').isDirectory()).toBe(true);
      const res = await dir.removeEntry('dir');
      expect(fs.existsSync('/dir')).toBe(false);
      expect(res).toBe(undefined);
    });

    test('throws "InvalidModificationError" DOMException if directory has contents', async () => {
      const { dir, fs } = setup({
        'dir/file': 'contents',
      });
      expect(fs.statSync('/dir').isDirectory()).toBe(true);
      let res: any;
      try {
        res = await dir.removeEntry('dir');
        throw new Error('Not this error.');
      } catch (error) {
        expect(res).toBe(undefined);
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('InvalidModificationError');
        expect(error.message).toBe('The object can not be modified in this way.');
      }
    });

    test('can recursively delete a folder with "recursive" flag', async () => {
      const { dir, fs } = setup({
        'dir/file': 'contents',
      });
      expect(fs.statSync('/dir').isDirectory()).toBe(true);
      const res = await dir.removeEntry('dir', { recursive: true });
      expect(fs.existsSync('/dir')).toBe(false);
      expect(res).toBe(undefined);
    });
  });

  describe('.resolve()', () => {
    test('return empty array for itself', async () => {
      const { dir } = setup({});
      const res = await dir.resolve(dir);
      expect(res).toStrictEqual([]);
    });

    test('can resolve one level deep child', async () => {
      const { dir } = setup({
        file: 'contents',
      });
      const child = await dir.getFileHandle('file');
      const res = await dir.resolve(child);
      expect(res).toStrictEqual(['file']);
    });

    test('can resolve two level deep child', async () => {
      const { dir } = setup({
        'dir/file': 'contents',
      });
      const child1 = await dir.getDirectoryHandle('dir');
      const child2 = await child1.getFileHandle('file');
      const res = await dir.resolve(child2);
      expect(res).toStrictEqual(['dir', 'file']);
      const res2 = await child1.resolve(child2);
      expect(res2).toStrictEqual(['file']);
    });

    test('returns "null" if not a descendant', async () => {
      const { dir } = setup({
        'dir/file': 'contents',
      });
      const child1 = await dir.getDirectoryHandle('dir');
      const res = await child1.resolve(dir);
      expect(res).toBe(null);
    });
  });
});
