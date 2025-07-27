import { fs, memfs } from '../index';

describe('fs.realpath.native', () => {
  it('should be accessible as a property of fs.realpath', () => {
    expect(typeof fs.realpath.native).toBe('function');
  });

  it('should work with callback', done => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    testFs.realpath.native('/symlink/file.txt', (err: any, path: any) => {
      expect(err).toBe(null);
      expect(path).toBe('/dir/file.txt');
      done();
    });
  });

  it('should work with options and callback', done => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    testFs.realpath.native('/symlink/file.txt', 'utf8', (err: any, path: any) => {
      expect(err).toBe(null);
      expect(path).toBe('/dir/file.txt');
      done();
    });
  });

  it('should work with options object and callback', done => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    testFs.realpath.native('/symlink/file.txt', { encoding: 'utf8' }, (err: any, path: any) => {
      expect(err).toBe(null);
      expect(path).toBe('/dir/file.txt');
      done();
    });
  });
});

describe('fs.realpathSync.native', () => {
  it('should be accessible as a property of fs.realpathSync', () => {
    expect(typeof fs.realpathSync.native).toBe('function');
  });

  it('should work synchronously', () => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    const path = testFs.realpathSync.native('/symlink/file.txt');
    expect(path).toBe('/dir/file.txt');
  });

  it('should work with options string', () => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    const path = testFs.realpathSync.native('/symlink/file.txt', 'utf8');
    expect(path).toBe('/dir/file.txt');
  });

  it('should work with options object', () => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    const path = testFs.realpathSync.native('/symlink/file.txt', { encoding: 'utf8' });
    expect(path).toBe('/dir/file.txt');
  });

  it('should behave identically to regular realpathSync', () => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    const regularPath = testFs.realpathSync('/symlink/file.txt');
    const nativePath = testFs.realpathSync.native('/symlink/file.txt');
    expect(regularPath).toBe(nativePath);
  });
});

describe('fs.realpath vs fs.realpath.native comparison', () => {
  it('should produce identical results for async calls', done => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    let regularResult: string | undefined;
    let nativeResult: string | undefined;
    let callsCompleted = 0;

    const checkResults = () => {
      callsCompleted++;
      if (callsCompleted === 2) {
        expect(regularResult).toBe(nativeResult);
        expect(regularResult).toBe('/dir/file.txt');
        done();
      }
    };

    testFs.realpath('/symlink/file.txt', (err: any, path: any) => {
      expect(err).toBe(null);
      regularResult = path;
      checkResults();
    });

    testFs.realpath.native('/symlink/file.txt', (err: any, path: any) => {
      expect(err).toBe(null);
      nativeResult = path;
      checkResults();
    });
  });

  it('should produce identical results for sync calls', () => {
    const { fs: testFs } = memfs({});
    testFs.mkdirSync('/dir');
    testFs.writeFileSync('/dir/file.txt', 'content');
    testFs.symlinkSync('/dir', '/symlink');

    const regularPath = testFs.realpathSync('/symlink/file.txt');
    const nativePath = testFs.realpathSync.native('/symlink/file.txt');

    expect(regularPath).toBe(nativePath);
    expect(regularPath).toBe('/dir/file.txt');
  });
});
