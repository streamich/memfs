import {
  Volume,
  Stats,
  Dirent,
  StatFs,
  FSWatcher,
  StatWatcher,
  toUnixTimestamp,
  FileHandle,
  Dir,
  FsPromises,
} from '..';
import { fsCallbackApiList } from '../lists/fsCallbackApiList';
import { fsSynchronousApiList } from '../lists/fsSynchronousApiList';

describe('@jsonjoy.com/fs-node', () => {
  it('Exports Volume constructor', () => {
    expect(typeof Volume).toBe('function');
  });

  it('Exports constructors', () => {
    expect(typeof Stats).toBe('function');
    expect(typeof Dirent).toBe('function');
    expect(typeof StatFs).toBe('function');
    expect(typeof FSWatcher).toBe('function');
    expect(typeof StatWatcher).toBe('function');
    expect(typeof FileHandle).toBe('function');
    expect(typeof Dir).toBe('function');
  });

  it('Exports toUnixTimestamp', () => {
    expect(typeof toUnixTimestamp).toBe('function');
  });

  it('Volume has all synchronous API methods', () => {
    const vol = new Volume();
    for (const method of fsSynchronousApiList) {
      expect(typeof vol[method]).toBe('function');
    }
  });

  it('Volume has all callback API methods', () => {
    const vol = new Volume();
    for (const method of fsCallbackApiList) {
      expect(typeof vol[method]).toBe('function');
    }
  });

  it('Volume has promises API', () => {
    const vol = new Volume();
    expect(typeof vol.promises).toBe('object');
  });
});
