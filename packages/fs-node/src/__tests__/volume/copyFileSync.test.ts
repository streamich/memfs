import { create } from '../util';
import { constants } from '@jsonjoy.com/fs-node-utils';

describe('copyFileSync(src, dest[, flags])', () => {
  it('method exists', () => {
    const vol = create();

    expect(typeof vol.copyFileSync).toBe('function');
  });

  it('throws on incorrect path arguments', () => {
    const vol = create();

    expect(() => {
      (vol as any).copyFileSync();
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync(1);
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync(1, 2);
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync({}, {});
    }).toThrow();
  });

  it('copies file', () => {
    const vol = create({
      '/foo': 'hello world',
    });

    vol.copyFileSync('/foo', '/bar');

    expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
  });

  describe('when COPYFILE_EXCL flag set', () => {
    it('should copy file, if destination does not exit', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      vol.copyFileSync('/foo', '/bar', constants.COPYFILE_EXCL);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });

    it('should throw, if file already exists', () => {
      const vol = create({
        '/foo': 'hello world',
        '/bar': 'no hello',
      });

      expect(() => {
        vol.copyFileSync('/foo', '/bar', constants.COPYFILE_EXCL);
      }).toThrowError(/EEXIST/);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('no hello');
    });
  });

  describe('when COPYFILE_FICLONE flag set', () => {
    it('copies file', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      vol.copyFileSync('/foo', '/bar', constants.COPYFILE_FICLONE);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });
  });

  describe('when COPYFILE_FICLONE_FORCE flag set', () => {
    it('always fails with ENOSYS', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      expect(() => {
        vol.copyFileSync('/foo', '/bar', constants.COPYFILE_FICLONE_FORCE);
      }).toThrowError(/ENOSYS/);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
    });
  });

  describe('permissions', () => {
    it('copying throws EACCES with insufficient permissions on the source file', () => {
      const vol = create({ '/foo': 'foo' });
      vol.chmodSync('/foo', 0o333); // wx across the board
      expect(() => {
        vol.copyFileSync('/foo', '/bar');
      }).toThrowError(/EACCES/);
    });

    it('copying throws EACCES with insufficient permissions on the source directory', () => {
      const vol = create({ '/foo/bar': 'foo' });
      vol.chmodSync('/foo', 0o666); // rw across the board
      expect(() => {
        vol.copyFileSync('/foo/bar', '/bar');
      }).toThrowError(/EACCES/);
    });

    it('copying throws EACCES with insufficient permissions on the destination directory', () => {
      const perms = [
        0o555, // rx
        0o666, // rw
        0o111, // x
        0o222, // w
      ];
      perms.forEach(perm => {
        const vol = create({ '/foo': 'foo' });
        vol.mkdirSync('/bar');
        vol.chmodSync('/bar', perm);
        expect(() => {
          vol.copyFileSync('/foo', '/bar/foo');
        }).toThrowError(/EACCES/);
      });
    });

    it('copying readonly source file should succeed', () => {
      const vol = create({ '/foo': 'hello world' });
      vol.chmodSync('/foo', 0o400); // read-only for owner

      // This should not throw - we can read the file even though it's read-only
      vol.copyFileSync('/foo', '/bar');

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });

    it('copying throws EACCES with insufficient permissions an intermediate directory', () => {
      const vol = create({ '/foo/test': 'test' });
      vol.mkdirSync('/bar');
      vol.chmodSync('/', 0o666); // rw across the board
      expect(() => {
        vol.copyFileSync('/foo/test', '/bar/test');
      }).toThrowError(/EACCES/);
    });
  });
});
