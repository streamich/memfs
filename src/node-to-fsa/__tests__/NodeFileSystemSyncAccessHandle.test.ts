import { DirectoryJSON, memfs } from '../..';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import {NodeFileSystemSyncAccessHandle} from '../NodeFileSystemSyncAccessHandle';
import { maybe } from './util';

const setup = (json: DirectoryJSON = {}) => {
  const fs = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', {syncHandleAllowed: true});
  return { dir, fs };
};

maybe('NodeFileSystemSyncAccessHandle', () => {
  describe('.close()', () => {
    test('can close the file', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      expect(sync).toBeInstanceOf(NodeFileSystemSyncAccessHandle);
      await sync.close();
      // ...
    });
  });

  describe('.flush()', () => {
    test('can flush', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      await sync.flush();
    });
  });

  describe('.getSize()', () => {
    test('can get file size', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      const size = await sync.getSize();
      expect(size).toBe(13);
    });
  });

  describe('.getSize()', () => {
    test('can get file size', async () => {
      const { dir } = setup({
        'file.txt': 'Hello, world!',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      const size = await sync.getSize();
      expect(size).toBe(13);
    });
  });

  describe('.read()', () => {
    test('can read from beginning', async () => {
      const { dir } = setup({
        'file.txt': '0123456789',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      const buf = new Uint8Array(5);
      const size = await sync.read(buf);
      expect(size).toBe(5);
      expect(Buffer.from(buf).toString()).toBe('01234');
    });

    test('can read at offset', async () => {
      const { dir } = setup({
        'file.txt': '0123456789',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      const buf = new Uint8Array(3);
      const size = await sync.read(buf, {at: 3});
      expect(size).toBe(3);
      expect(Buffer.from(buf).toString()).toBe('345');
    });

    test('can read into buffer larger than file', async () => {
      const { dir } = setup({
        'file.txt': '0123456789',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      const buf = new Uint8Array(25);
      const size = await sync.read(buf);
      expect(size).toBe(10);
      expect(Buffer.from(buf).slice(0, 10).toString()).toBe('0123456789');
    });

    test('throws "InvalidStateError" DOMException if handle is closed', async () => {
      const { dir } = setup({
        'file.txt': '0123456789',
      });
      const entry = await dir.getFileHandle('file.txt');
      const sync = await entry.createSyncAccessHandle!();
      await sync.close();
      const buf = new Uint8Array(25);
      try {
        const size = await sync.read(buf);
        throw new Error('No error was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('InvalidStateError');
      }
    });
  });
});
