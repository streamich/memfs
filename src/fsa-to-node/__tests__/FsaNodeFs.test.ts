import {IFsWithVolume, memfs} from '../..';
import {nodeToFsa} from '../../node-to-fsa';
import {FsaNodeFs} from '../FsaNodeFs';

const setup = () => {
  const mfs = memfs({ mountpoint: null }) as IFsWithVolume;
  const dir = nodeToFsa(mfs, '/mountpoint', {mode: 'readwrite'});
  const fs = new FsaNodeFs(dir);
  return { fs, mfs, dir };
};

describe('.mkdir()', () => {
  test('can create a sub-folder', async () => {
    const { fs, mfs } = setup();
    await new Promise<void>((resolve, reject) => fs.mkdir('/test', (err) => {
      if (err) return reject(err);
      return resolve();
    }));
    expect(mfs.statSync('/mountpoint/test').isDirectory()).toBe(true);
  });

  test('throws when creating sub-sub-folder', async () => {
    const { fs } = setup();
    try {
      await new Promise<void>((resolve, reject) => fs.mkdir('/test/subtest', (err) => {
        if (err) return reject(err);
        return resolve();
      }));
      throw new Error('Expected error');
    } catch (error) {
      expect(error.code).toBe('ENOTDIR');
    }
  });

  test('can create sub-sub-folder with "recursive" flag', async () => {
    const { fs, mfs } = setup();
    await new Promise<void>((resolve, reject) => fs.mkdir('/test/subtest', {recursive: true}, (err) => {
      if (err) return reject(err);
      return resolve();
    }));
    expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
  });

  test('can create sub-sub-folder with "recursive" flag with Promises API', async () => {
    const { fs, mfs } = setup();
    await fs.promises.mkdir('/test/subtest', {recursive: true});
    expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
  });
});
