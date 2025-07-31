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

onlyOnNode20('CoreFileSystemHandle', () => {
  test('has correct kind and name for directory', async () => {
    const { dir } = setup({ folder: null });
    const subdir = await dir.getDirectoryHandle('folder');
    expect(subdir.kind).toBe('directory');
    expect(subdir.name).toBe('folder');
  });

  test('has correct kind and name for file', async () => {
    const { dir } = setup({ 'test.txt': 'content' });
    const file = await dir.getFileHandle('test.txt');
    expect(file.kind).toBe('file');
    expect(file.name).toBe('test.txt');
  });

  test('isSameEntry returns true for same handles', async () => {
    const { dir } = setup({ 'test.txt': 'content' });
    const file1 = await dir.getFileHandle('test.txt');
    const file2 = await dir.getFileHandle('test.txt');
    expect(file1.isSameEntry(file2)).toBe(true);
  });

  test('isSameEntry returns false for different handles', async () => {
    const { dir } = setup({ 
      'test1.txt': 'content1',
      'test2.txt': 'content2'
    });
    const file1 = await dir.getFileHandle('test1.txt');
    const file2 = await dir.getFileHandle('test2.txt');
    expect(file1.isSameEntry(file2)).toBe(false);
  });

  test('isSameEntry returns false for different types', async () => {
    const { dir } = setup({ 
      'test.txt': 'content',
      folder: null
    });
    const file = await dir.getFileHandle('test.txt');
    const folder = await dir.getDirectoryHandle('folder');
    expect(file.isSameEntry(folder)).toBe(false);
  });

  test('queryPermission throws not implemented error', async () => {
    const { dir } = setup({ 'test.txt': 'content' });
    const file = await dir.getFileHandle('test.txt');
    expect(() => file.queryPermission({ mode: 'read' })).toThrow('Not implemented');
  });

  test('requestPermission throws not implemented error', async () => {
    const { dir } = setup({ 'test.txt': 'content' });
    const file = await dir.getFileHandle('test.txt');
    expect(() => file.requestPermission({ mode: 'read' })).toThrow('Not implemented');
  });

  test('remove throws not implemented error', async () => {
    const { dir } = setup({ 'test.txt': 'content' });
    const file = await dir.getFileHandle('test.txt');
    await expect(file.remove()).rejects.toThrow('Not implemented');
  });
});