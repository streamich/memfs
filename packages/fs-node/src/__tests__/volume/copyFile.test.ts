import { create, multitest } from '../util';
import { constants } from '@jsonjoy.com/fs-node-utils';

describe('copyFile(src, dest[, flags], callback)', () => {
  it('method exists', () => {
    const vol = create();

    expect(typeof vol.copyFile).toBe('function');
  });

  it('copies a file', done => {
    const vol = create({
      '/foo': 'hello world',
    });

    expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
    expect(() => {
      vol.readFileSync('/bar', 'utf8');
    }).toThrow();

    vol.copyFile('/foo', '/bar', (err, result) => {
      expect(!!err).toBe(false);
      expect(result).toBe(undefined);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
      done();
    });
  });

  it('honors COPYFILE_EXCL flag', done => {
    const vol = create({
      '/foo': 'hello world',
      '/bar': 'already exists',
    });

    vol.copyFile('/foo', '/bar', constants.COPYFILE_EXCL, (err, result) => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('message', expect.stringContaining('EEXIST'));
      expect(result).toBe(undefined);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('already exists');
      done();
    });
  });

  describe('permissions', () => {
    it('copying gives EACCES with insufficient permissions on the source file', done => {
      const vol = create({ '/foo': 'foo' });
      vol.chmodSync('/foo', 0o333); // wx across the board
      vol.copyFile('/foo', '/bar', err => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('code', 'EACCES');
        } finally {
          done();
        }
      });
    });

    it('copying gives EACCES with insufficient permissions on the source directory', done => {
      const vol = create({ '/foo/bar': 'foo' });
      vol.chmodSync('/foo', 0o666); // rw across the board
      vol.copyFile('/foo/bar', '/bar', err => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('code', 'EACCES');
          done();
        } catch (failure) {
          done(failure);
        }
      });
    });

    it('copying gives EACCES with insufficient permissions on the destination directory', _done => {
      const perms = [
        0o555, // rx
        0o666, // rw
        0o111, // x
        0o222, // w
      ];
      const done = multitest(_done, perms.length);

      perms.forEach(perm => {
        const vol = create({ '/foo': 'foo' });
        vol.mkdirSync('/bar');
        vol.chmodSync('/bar', perm);
        vol.copyFile('/foo', '/bar/foo', err => {
          try {
            expect(err).toBeInstanceOf(Error);
            expect(err).toHaveProperty('code', 'EACCES');
            done();
          } catch (failure) {
            done(failure);
          }
        });
      });
    });
  });

  it('copying readonly source file should succeed', done => {
    const vol = create({ '/foo': 'hello world' });
    vol.chmodSync('/foo', 0o400); // read-only for owner

    // This should not throw - we can read the file even though it's read-only
    vol.copyFile('/foo', '/bar', err => {
      try {
        expect(err).toBeNull();
        expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
        expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  it('copying gives EACCES with insufficient permissions on an intermediate directory', done => {
    const vol = create({ '/foo/test': 'test' });
    vol.mkdirSync('/bar');
    vol.chmodSync('/', 0o666); // rw
    vol.copyFile('/foo/test', '/bar/test', err => {
      try {
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });
});
