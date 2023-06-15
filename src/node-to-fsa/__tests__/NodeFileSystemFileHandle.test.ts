import { DirectoryJSON, IFsWithVolume, memfs } from '../..';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { onlyOnNode20 } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/') as IFsWithVolume;
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'readwrite' });
  return { dir, fs };
};

onlyOnNode20('NodeFileSystemFileHandle', () => {
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
    test('throws if not in "readwrite" mode', async () => {
      const fs = memfs({ 'file.txt': 'abc' }, '/') as IFsWithVolume;
      const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'read' });
      const entry = await dir.getFileHandle('file.txt');
      try {
        await entry.createWritable();
        throw new Error('Not this error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('NotAllowedError');
        expect(error.message).toBe(
          'The request is not allowed by the user agent or the platform in the current context.',
        );
      }
    });

    describe('.truncate()', () => {
      test('can truncate file', async () => {
        const { dir, fs } = setup({
          'file.txt': '012345',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.truncate(3);
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('012');
      });

      test('can truncate file - 2', async () => {
        const { dir, fs } = setup({
          'file.txt': '012345',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'truncate', size: 3 });
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('012');
      });

      test('can truncate up', async () => {
        const { dir, fs } = setup({
          'file.txt': '012345',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'truncate', size: 10 });
        await writable.close();
        expect(fs.readFileSync('/file.txt').length).toBe(10);
        expect(fs.readFileSync('/file.txt')[8]).toBe(0);
      });

      test('on up truncation bytes are nulled', async () => {
        const { dir, fs } = setup({
          'file.txt': '012345',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'truncate', size: 10 });
        await writable.close();
        expect(fs.readFileSync('/file.txt')[8]).toBe(0);
      });
    });

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

      test('writes at file start', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write('1');
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('1..');
      });

      test('can seek and then write', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        writable.seek(1);
        await writable.write('1');
        await writable.write('2');
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('...');
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('.12');
      });

      test('does not commit changes before .close() is called', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable();
        await writable.write('1');
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('...');
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('1');
      });

      test('does not commit changes if .abort() is called and removes the swap file', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable();
        await writable.write('1');
        expect(fs.__vol.toJSON()).toStrictEqual({
          '/file.txt': '...',
          '/file.txt.crswap': '1',
        });
        await writable.abort();
        expect(fs.__vol.toJSON()).toStrictEqual({
          '/file.txt': '...',
        });
      });
    });

    describe('.write(options)', () => {
      test('can write at offset, when providing position in write call', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'write', position: 1, data: '1' });
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('.1.');
      });

      test('can seek and then write', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'seek', position: 1 });
        await writable.write({ type: 'write', data: Buffer.from('1') });
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('.1.');
      });

      test('can seek and then write', async () => {
        const { dir, fs } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable({ keepExistingData: true });
        await writable.write({ type: 'seek', position: 1 });
        await writable.write({ type: 'write', data: Buffer.from('1') });
        await writable.close();
        expect(fs.readFileSync('/file.txt', 'utf8')).toBe('.1.');
      });
    });
  });
});
