import { IFsWithVolume, NestedDirectoryJSON, memfs } from '../..';
import { nodeToFsa } from '../../node-to-fsa';
import { FsaNodeFs } from '../FsaNodeFs';

const setup = (json: NestedDirectoryJSON | null = null) => {
  const mfs = memfs({ mountpoint: json }) as IFsWithVolume;
  const dir = nodeToFsa(mfs, '/mountpoint', { mode: 'readwrite' });
  const fs = new FsaNodeFs(dir);
  return { fs, mfs, dir };
};

describe('.mkdir()', () => {
  test('can create a sub-folder', async () => {
    const { fs, mfs } = setup();
    await new Promise<void>((resolve, reject) =>
      fs.mkdir('/test', err => {
        if (err) return reject(err);
        return resolve();
      }),
    );
    expect(mfs.statSync('/mountpoint/test').isDirectory()).toBe(true);
  });

  test('throws when creating sub-sub-folder', async () => {
    const { fs } = setup();
    try {
      await new Promise<void>((resolve, reject) =>
        fs.mkdir('/test/subtest', err => {
          if (err) return reject(err);
          return resolve();
        }),
      );
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOENT');
    }
  });

  test('can create sub-sub-folder with "recursive" flag', async () => {
    const { fs, mfs } = setup();
    await new Promise<void>((resolve, reject) =>
      fs.mkdir('/test/subtest', { recursive: true }, err => {
        if (err) return reject(err);
        return resolve();
      }),
    );
    expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
  });

  test('can create sub-sub-folder with "recursive" flag with Promises API', async () => {
    const { fs, mfs } = setup();
    await fs.promises.mkdir('/test/subtest', { recursive: true });
    expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
  });

  test('cannot create a folder over a file', async () => {
    const { fs } = setup({ file: 'test' });
    try {
      await fs.promises.mkdir('/file/folder', { recursive: true });
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOTDIR');
    }
  });
});

describe('.mkdtemp()', () => {
  test('can create a temporary folder', async () => {
    const { fs, mfs } = setup();
    const dirname = (await fs.promises.mkdtemp('prefix--')) as string;
    expect(dirname.startsWith('prefix--')).toBe(true);
    expect(mfs.statSync('/mountpoint/' + dirname).isDirectory()).toBe(true);
  });
});

describe('.rmdir()', () => {
  test('can remove an empty folder', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    await fs.promises.rmdir('/empty-folder');
    expect(mfs.__vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
  });

  test('throws when attempts to remove non-empty folder', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    try {
      await fs.promises.rmdir('/folder');
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOTEMPTY');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/empty-folder': null,
      });
    }
  });

  test('can remove non-empty directory recursively', async () => {
    const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
    await fs.promises.rmdir('/folder', { recursive: true });
    expect(mfs.__vol.toJSON()).toStrictEqual({
      '/mountpoint/empty-folder': null,
    });
  });
});

describe('.rm()', () => {
  test('can remove an empty folder', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    await fs.promises.rm('/empty-folder');
    expect(mfs.__vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
  });

  test('throws when attempts to remove non-empty folder', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    try {
      await fs.promises.rm('/folder');
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOTEMPTY');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/empty-folder': null,
      });
    }
  });

  test('can remove non-empty directory recursively', async () => {
    const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
    await fs.promises.rm('/folder', { recursive: true });
    expect(mfs.__vol.toJSON()).toStrictEqual({
      '/mountpoint/empty-folder': null,
    });
  });

  test('throws if path does not exist', async () => {
    const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
    try {
      await fs.promises.rm('/lala/lulu', { recursive: true });
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOENT');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/subfolder/file': 'test',
        '/mountpoint/empty-folder': null,
      });
    }
  });

  test('does not throw, if path does not exist, but "force" flag set', async () => {
    const { fs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
    await fs.promises.rm('/lala/lulu', { recursive: true, force: true });
  });
});

describe('.unlink()', () => {
  test('can remove a file', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    const res = await fs.promises.unlink('/folder/file');
    expect(res).toBe(undefined);
    expect(mfs.__vol.toJSON()).toStrictEqual({
      '/mountpoint/folder': null,
      '/mountpoint/empty-folder': null,
    });
  });

  test('cannot delete a folder', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    try {
      await fs.promises.unlink('/folder');
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('EISDIR');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/empty-folder': null,
      });
    }
  });

  test('throws when deleting non-existing file', async () => {
    const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    try {
      await fs.promises.unlink('/folder/not-a-file');
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOENT');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/empty-folder': null,
      });
    }
  });
});

describe('.readFile()', () => {
  test('can read file contents', async () => {
    const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    const data = await fs.promises.readFile('/folder/file');
    expect(data.toString()).toBe('test');
  });

  test('can read file by file descriptor', async () => {
    const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
    const fd = await fs.promises.open('/folder/file');
    const data = await fs.promises.readFile(fd);
    expect(data.toString()).toBe('test');
  });
});

