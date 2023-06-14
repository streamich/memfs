import { DirectoryJSON, memfs } from '../..';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import {maybe} from './util';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/');
  return { dir, fs };
};

maybe('NodeFileSystemFileHandle', () => {
  describe('.getFile()', () => {
    test('can read file contents', async () => {
      console.log(+process.version.split('.')[0].slice(1))
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry =  await dir.getFileHandle('file.txt');
      const file = await entry.getFile();
      console.log(file);
    });
  });
});
