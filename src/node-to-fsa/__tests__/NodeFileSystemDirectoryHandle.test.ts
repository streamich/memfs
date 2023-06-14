import {DirectoryJSON, memfs} from '../..';
import {NodeFileSystemDirectoryHandle} from '../NodeFileSystemDirectoryHandle';

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
