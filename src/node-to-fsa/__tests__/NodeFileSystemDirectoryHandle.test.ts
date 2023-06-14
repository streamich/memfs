import {DirectoryJSON, memfs} from '../..';
import {NodeFileSystemDirectoryHandle} from '../NodeFileSystemDirectoryHandle';
import {NodeFileSystemFileHandle} from '../NodeFileSystemFileHandle';
import {NodeFileSystemHandle} from '../NodeFileSystemHandle';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs, '/');
  return {dir, fs};
};

test('can instantiate', () => {
  const {dir} = setup();
  expect(dir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
});

describe('.keys()', () => {
  test('returns an empty iterator for an empty directory', async () => {
    const {dir} = setup();
    const keys = dir.keys();
    expect(await keys.next()).toEqual({done: true, value: undefined});
  });

  test('returns a folder', async () => {
    const {dir} = setup({folder: null});
    const list: string [] = [];
    for await (const key of dir.keys()) list.push(key);
    expect(list).toEqual(['folder']);
  });

  test('returns two folders', async () => {
    const {dir} = setup({
      folder: null,
      'another/folder': null,
    });
    const list: string [] = [];
    for await (const key of dir.keys()) list.push(key);
    expect(list.length).toBe(2);
  });

  test('returns a file', async () => {
    const {dir} = setup({
      'file.txt': 'Hello, world!',
    });
    const list: string [] = [];
    for await (const key of dir.keys()) list.push(key);
    expect(list).toEqual(['file.txt']);
  });
});

describe('.entries()', () => {
  test('returns an empty iterator for an empty directory', async () => {
    const {dir} = setup();
    const keys = dir.entries();
    expect(await keys.next()).toEqual({done: true, value: undefined});
  });

  test('returns a folder', async () => {
    const {dir} = setup({'My Documents': null});
    for await (const [name, subdir] of dir.entries()) {
      expect(name).toBe('My Documents');
      expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
      expect(subdir.kind).toBe('directory');
      expect(subdir.name).toBe('My Documents');
    }
  });

  test('returns a file', async () => {
    const {dir} = setup({
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
    const {dir} = setup({
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
    const {dir} = setup();
    const values = dir.values();
    expect(await values.next()).toEqual({done: true, value: undefined});
  });

  test('returns a folder', async () => {
    const {dir} = setup({'My Documents': null});
    for await (const subdir of dir.values()) {
      expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
      expect(subdir.kind).toBe('directory');
      expect(subdir.name).toBe('My Documents');
    }
  });

  test('returns a file', async () => {
    const {dir} = setup({
      'file.txt': 'Hello, world!',
    });
    for await (const file of dir.values()) {
      expect(file).toBeInstanceOf(NodeFileSystemFileHandle);
      expect(file.kind).toBe('file');
      expect(file.name).toBe('file.txt');
    }
  });

  test('returns two entries', async () => {
    const {dir} = setup({
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
    const {dir} = setup({a: null});
    try {
      await dir.getDirectoryHandle('b');
      throw new Error('Not this error.');
    } catch (error) {
      expect(error).toBeInstanceOf(DOMException);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('A requested file or directory could not be found at the time an operation was processed.');
    }
  });

  test('throws "TypeMismatchError" DOMException if entry is not a directory', async () => {
    const {dir} = setup({file: 'contents'});
    try {
      await dir.getDirectoryHandle('file');
      throw new Error('Not this error.');
    } catch (error) {
      expect(error).toBeInstanceOf(DOMException);
      expect(error.name).toBe('TypeMismatchError');
      expect(error.message).toBe('The path supplied exists, but was not an entry of requested type.');
    }
  });

  const invalidNames = ['.', '..', '/', '/a', 'a/', 'a//b', 'a/.', 'a/..', 'a/b/.', 'a/b/..', '\\', '\\a', 'a\\', 'a\\\\b', 'a\\.'];

  for (const invalidName of invalidNames) {
    test(`throws on invalid file name: "${invalidName}"`, async () => {
      const {dir} = setup({file: 'contents'});
      try {
        await dir.getDirectoryHandle(invalidName);
        throw new Error('Not this error.');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe(`Failed to execute 'getDirectoryHandle' on 'FileSystemDirectoryHandle': Name is not allowed.`);
      }
    });
  }

  test('can retrieve a child directory', async () => {
    const {dir} = setup({file: 'contents', subdir: null});
    const subdir = await dir.getDirectoryHandle('subdir');
    expect(subdir.kind).toBe('directory');
    expect(subdir.name).toBe('subdir');
    expect(subdir).toBeInstanceOf(NodeFileSystemDirectoryHandle);
  });
});
