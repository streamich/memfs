import { DirectoryJSON, memfs } from 'memfs';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { onlyOnNode20 } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const { fs, vol } = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'readwrite' });
  return { dir, fs, vol };
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
      const { fs } = memfs({ 'file.txt': 'abc' }, '/');
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
        const { dir, vol } = setup({
          'file.txt': '...',
        });
        const entry = await dir.getFileHandle('file.txt');
        const writable = await entry.createWritable();
        await writable.write('1');
        expect(vol.toJSON()).toStrictEqual({
          '/file.txt': '...',
          '/file.txt.crswap': '1',
        });
        await writable.abort();
        expect(vol.toJSON()).toStrictEqual({
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

  describe('file locking', () => {
    describe('sync access handle locking', () => {
      test('creates sync access handle successfully', async () => {
        const { fs } = memfs({ 'test.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('test.txt');
        const syncHandle = await fileHandle.createSyncAccessHandle!();
        expect(syncHandle).toBeDefined();
        await syncHandle.close();
      });

      test('throws NoModificationAllowedError when creating sync handle while file is locked', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');
        const syncHandle1 = await fileHandle.createSyncAccessHandle!();

        // Try to create another sync handle while first is open
        try {
          await fileHandle.createSyncAccessHandle!();
          throw new Error('Expected NoModificationAllowedError');
        } catch (error) {
          expect(error).toBeInstanceOf(DOMException);
          expect((error as any).name).toBe('NoModificationAllowedError');
        }

        await syncHandle1.close();
      });

      test('allows creating sync handle after previous one is closed', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');

        const syncHandle1 = await fileHandle.createSyncAccessHandle!();
        await syncHandle1.close();

        // Should not throw
        const syncHandle2 = await fileHandle.createSyncAccessHandle!();
        expect(syncHandle2).toBeDefined();
        await syncHandle2.close();
      });
    });

    describe('writable stream locking', () => {
      test('creates writable stream successfully', async () => {
        const { dir } = setup({ 'test.txt': 'content' });
        const fileHandle = await dir.getFileHandle('test.txt');
        const writable = await fileHandle.createWritable();
        expect(writable).toBeDefined();
        await writable.close();
      });

      test('throws NoModificationAllowedError when creating writable stream while sync handle is open', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');
        const syncHandle = await fileHandle.createSyncAccessHandle!();

        // Try to create writable stream while sync handle is open
        try {
          await fileHandle.createWritable();
          throw new Error('Expected NoModificationAllowedError');
        } catch (error) {
          expect(error).toBeInstanceOf(DOMException);
          expect((error as any).name).toBe('NoModificationAllowedError');
        }

        await syncHandle.close();
      });

      test('allows creating writable stream after sync handle is closed', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');

        const syncHandle = await fileHandle.createSyncAccessHandle!();
        await syncHandle.close();

        // Should not throw
        const writable = await fileHandle.createWritable();
        expect(writable).toBeDefined();
        await writable.close();
      });

      test('throws NoModificationAllowedError when creating sync handle while writable stream is open', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');
        const writable = await fileHandle.createWritable();

        // Try to create sync handle while writable stream is open
        try {
          await fileHandle.createSyncAccessHandle!();
          throw new Error('Expected NoModificationAllowedError');
        } catch (error) {
          expect(error).toBeInstanceOf(DOMException);
          expect((error as any).name).toBe('NoModificationAllowedError');
        }

        await writable.close();
      });

      test('allows creating sync handle after writable stream is closed', async () => {
        const { fs } = memfs({ 'file.txt': 'content' }, '/');
        const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {
          syncHandleAllowed: true,
          mode: 'readwrite',
        });
        const fileHandle = await dir.getFileHandle('file.txt');

        const writable = await fileHandle.createWritable();
        await writable.close();

        // Should not throw
        const syncHandle = await fileHandle.createSyncAccessHandle!();
        expect(syncHandle).toBeDefined();
        await syncHandle.close();
      });
    });

    describe('multiple writable streams', () => {
      test('throws NoModificationAllowedError when creating second writable stream', async () => {
        const { dir } = setup({ 'test.txt': 'content' });
        const fileHandle = await dir.getFileHandle('test.txt');

        const writable1 = await fileHandle.createWritable();

        // Try to create second writable stream
        try {
          await fileHandle.createWritable();
          throw new Error('Expected NoModificationAllowedError');
        } catch (error) {
          expect(error).toBeInstanceOf(DOMException);
          expect((error as any).name).toBe('NoModificationAllowedError');
        }

        await writable1.close();
      });
    });
  });
});
