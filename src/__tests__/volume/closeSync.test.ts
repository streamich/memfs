import { Volume } from '../..';

describe('.closeSync(fd)', () => {
  const vol = new Volume();
  it('Closes file without errors', () => {
    const fd = vol.openSync('/test.txt', 'w');
    vol.closeSync(fd);
  });
  it('Correct error when file descriptor is not a number', () => {
    const vol = Volume.fromJSON({ '/foo': 'bar' });
    try {
      const fd = vol.openSync('/foo', 'r');
      vol.closeSync(String(fd) as any);
      throw Error('This should not throw');
    } catch (err) {
      expect(err.message).toEqual('fd must be a file descriptor');
    }
  });
  it('Closing file descriptor that does not exist', () => {
    const vol = new Volume();
    try {
      vol.closeSync(1234);
      throw Error('This should not throw');
    } catch (err) {
      expect(err.code).toEqual('EBADF');
    }
  });
  it('Closing same file descriptor twice throws EBADF', () => {
    const fd = vol.openSync('/test.txt', 'w');
    vol.closeSync(fd);
    try {
      vol.closeSync(fd);
      throw Error('This should not throw');
    } catch (err) {
      expect(err.code).toEqual('EBADF');
    }
  });
  it('Closing a file decreases the number of open files', () => {
    const fd = vol.openSync('/test.txt', 'w');
    const openFiles = vol.openFiles;
    vol.closeSync(fd);
    expect(openFiles).toBeGreaterThan(vol.openFiles);
  });
  it('When closing a file, its descriptor is added to the pool of descriptors to be reused', () => {
    const fd = vol.openSync('/test.txt', 'w');
    const usedFdLength = vol.releasedFds.length;
    vol.closeSync(fd);
    expect(usedFdLength).toBeLessThan(vol.releasedFds.length);
  });
});
