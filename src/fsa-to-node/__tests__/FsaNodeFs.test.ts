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
    expect(mfs.__vol.toJSON()).toStrictEqual({'/mountpoint/folder/file': 'test'});
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
    const { fs, mfs } = setup({ folder: { subfolder: {file: 'test'} }, 'empty-folder': null });
    await fs.promises.rmdir('/folder', {recursive: true});
    expect(mfs.__vol.toJSON()).toStrictEqual({
      '/mountpoint/empty-folder': null,
    });
  });
});
