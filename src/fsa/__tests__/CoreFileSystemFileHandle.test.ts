import { Superblock } from '../../core/Superblock';
import { CoreFileSystemDirectoryHandle } from '../CoreFileSystemDirectoryHandle';
import { CoreFileSystemFileHandle } from '../CoreFileSystemFileHandle';
import { onlyOnNode20 } from '../../__tests__/util';
import { DirectoryJSON } from '../../core/json';

const setup = (json: DirectoryJSON = {}) => {
  const core = Superblock.fromJSON(json, '/');
  const dir = new CoreFileSystemDirectoryHandle(core, '/', { mode: 'readwrite' });
  return { dir, core };
};

onlyOnNode20('CoreFileSystemFileHandle', () => {
  test('can instantiate', async () => {
    const { dir } = setup({ 'test.txt': 'Hello, world!' });
    const file = await dir.getFileHandle('test.txt');
    expect(file).toBeInstanceOf(CoreFileSystemFileHandle);
    expect(file.kind).toBe('file');
    expect(file.name).toBe('test.txt');
  });

  describe('.getFile()', () => {
    test('can read file content', async () => {
      const content = 'Hello, world!';
      const { dir } = setup({ 'test.txt': content });
      const fileHandle = await dir.getFileHandle('test.txt');
      const file = await fileHandle.getFile();
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test.txt');
      expect(file.size).toBe(content.length);
      expect(await file.text()).toBe(content);
    });

    test('works with binary content', async () => {
      const content = Buffer.from([1, 2, 3, 4, 5]);
      const { core } = setup();
      // Create file with binary content
      core.writeFile('/binary.dat', content, 0x200 | 0x40 | 0x1, 0o644); // O_CREAT | O_TRUNC | O_WRONLY
      
      const dir = new CoreFileSystemDirectoryHandle(core, '/', { mode: 'readwrite' });
      const fileHandle = await dir.getFileHandle('binary.dat');
      const file = await fileHandle.getFile();
      
      expect(file.size).toBe(5);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      expect(Array.from(uint8Array)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('.createWritable()', () => {
    test('can create writable stream', async () => {
      const { dir } = setup({ 'test.txt': 'initial content' });
      const fileHandle = await dir.getFileHandle('test.txt');
      const writable = await fileHandle.createWritable();
      expect(writable).toBeDefined();
      
      await writable.write('new content');
      await writable.close();
      
      const file = await fileHandle.getFile();
      expect(await file.text()).toBe('new content');
    });

    test('can create writable stream with keepExistingData', async () => {
      const { dir } = setup({ 'test.txt': 'initial content' });
      const fileHandle = await dir.getFileHandle('test.txt');
      const writable = await fileHandle.createWritable({ keepExistingData: true });
      expect(writable).toBeDefined();
      
      await writable.seek(8); // Move past "initial "
      await writable.write('new data');
      await writable.close();
      
      const file = await fileHandle.getFile();
      expect(await file.text()).toBe('initial new data');
    });
  });

  describe('.createSyncAccessHandle', () => {
    test('returns undefined when sync handle not allowed', async () => {
      const { dir } = setup({ 'test.txt': 'content' });
      const fileHandle = await dir.getFileHandle('test.txt');
      expect(fileHandle.createSyncAccessHandle).toBeUndefined();
    });

    test('returns function when sync handle allowed', async () => {
      const core = Superblock.fromJSON({ 'test.txt': 'content' }, '/');
      const dir = new CoreFileSystemDirectoryHandle(core, '/', { 
        mode: 'readwrite', 
        syncHandleAllowed: true 
      });
      const fileHandle = await dir.getFileHandle('test.txt');
      expect(fileHandle.createSyncAccessHandle).toBeDefined();
      expect(typeof fileHandle.createSyncAccessHandle).toBe('function');
    });
  });

  describe('file operations', () => {
    test('can work with empty file', async () => {
      const { dir } = setup({ 'empty.txt': '' });
      const fileHandle = await dir.getFileHandle('empty.txt');
      const file = await fileHandle.getFile();
      expect(file.size).toBe(0);
      expect(await file.text()).toBe('');
    });

    test('can handle files with special characters in name', async () => {
      const { dir } = setup({ 'special-file_123.txt': 'content' });
      const fileHandle = await dir.getFileHandle('special-file_123.txt');
      expect(fileHandle.name).toBe('special-file_123.txt');
      const file = await fileHandle.getFile();
      expect(await file.text()).toBe('content');
    });
  });
});