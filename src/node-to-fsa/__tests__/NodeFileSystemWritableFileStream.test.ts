import { IFsWithVolume, memfs } from '../..';
import { FileHandle } from '../../node/FileHandle';
import { createSwapFile } from '../NodeFileSystemWritableFileStream';

describe('createSwapFile()', () => {
  test('can create a swap file', async () => {
    const { fs, vol } = memfs(
      {
        '/file.txt': 'Hello, world!',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/file.txt', false);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/file.txt.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/file.txt': 'Hello, world!',
      '/file.txt.crswap': '',
    });
  });

  test('can create a swap file at subfolder', async () => {
    const { fs, vol } = memfs(
      {
        '/foo/file.txt': 'Hello, world!',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/foo/file.txt', false);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/foo/file.txt.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/foo/file.txt': 'Hello, world!',
      '/foo/file.txt.crswap': '',
    });
  });

  test('can create a swap file when the default swap file name is in use', async () => {
    const { fs, vol } = memfs(
      {
        '/foo/file.txt': 'Hello, world!',
        '/foo/file.txt.crswap': 'lala',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/foo/file.txt', false);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/foo/file.txt.1.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/foo/file.txt': 'Hello, world!',
      '/foo/file.txt.crswap': 'lala',
      '/foo/file.txt.1.crswap': '',
    });
  });

  test('can create a swap file when the first two names are already taken', async () => {
    const { fs, vol } = memfs(
      {
        '/foo/file.txt': 'Hello, world!',
        '/foo/file.txt.crswap': 'lala',
        '/foo/file.txt.1.crswap': 'blah',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/foo/file.txt', false);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/foo/file.txt.2.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/foo/file.txt': 'Hello, world!',
      '/foo/file.txt.crswap': 'lala',
      '/foo/file.txt.1.crswap': 'blah',
      '/foo/file.txt.2.crswap': '',
    });
  });

  test('can create a swap file when the first three names are already taken', async () => {
    const { fs, vol } = memfs(
      {
        '/foo/file.txt': 'Hello, world!',
        '/foo/file.txt.crswap': 'lala',
        '/foo/file.txt.1.crswap': 'blah',
        '/foo/file.txt.2.crswap': 'brawo',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/foo/file.txt', false);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/foo/file.txt.3.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/foo/file.txt': 'Hello, world!',
      '/foo/file.txt.crswap': 'lala',
      '/foo/file.txt.1.crswap': 'blah',
      '/foo/file.txt.2.crswap': 'brawo',
      '/foo/file.txt.3.crswap': '',
    });
  });

  test('can copy existing data into the swap file', async () => {
    const { fs, vol } = memfs(
      {
        '/foo/file.txt': 'Hello, world!',
        '/foo/file.txt.crswap': 'lala',
        '/foo/file.txt.1.crswap': 'blah',
        '/foo/file.txt.2.crswap': 'brawo',
      },
      '/',
    );
    const [handle, path] = await createSwapFile(fs, '/foo/file.txt', true);
    expect(handle).toBeInstanceOf(FileHandle);
    expect(path).toBe('/foo/file.txt.3.crswap');
    expect(vol.toJSON()).toStrictEqual({
      '/foo/file.txt': 'Hello, world!',
      '/foo/file.txt.crswap': 'lala',
      '/foo/file.txt.1.crswap': 'blah',
      '/foo/file.txt.2.crswap': 'brawo',
      '/foo/file.txt.3.crswap': 'Hello, world!',
    });
  });
});
