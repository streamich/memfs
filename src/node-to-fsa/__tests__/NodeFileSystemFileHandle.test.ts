import { DirectoryJSON, memfs } from '../..';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { maybe } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/');
  return { dir, fs };
};

maybe('NodeFileSystemFileHandle', () => {
  describe('.getFile()', () => {
    test('can read file contents', async () => {
      const { dir, fs } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry = await dir.getFileHandle('file.txt');
      const file = await entry.getFile();
      const contents = await file.text();
      expect(entry.name).toBe('file.txt');
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('file.txt');
      expect(file.lastModified).toBe(fs.statSync('/file.txt').mtime.getTime());
      expect(contents).toBe('Hello, world!');
    });
  });

  describe('.createWritable()', () => {
    describe('.write(chunk)', () => {
      test('overwrites the file when write is being executed', async () => {
        const { dir, fs } = setup({
          'file.txt': 'Hello, world!',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable();
        await writable.write('...');
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('...');
      });

      test('can seek and then write', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({keepExistingData: true});
        writable.seek(1);
        await writable.write('1');
        await writable.write('2');
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('.12');
      });
    });
  });
});
