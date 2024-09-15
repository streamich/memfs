import { create, multitest } from '../util';

describe('renameSync(fromPath, toPath)', () => {
  it('Renames a simple case', done => {
    const vol = create({ '/foo': 'bar' });
    vol.rename('/foo', '/foo2', (err, res) => {
      expect(vol.toJSON()).toEqual({ '/foo2': 'bar' });
      done();
    });
  });

  it('gives EACCES when source directory has insufficient permissions', _done => {
    const perms = [
      0o666, // rw
      0o555, // rx - insufficient because the file will be removed from this directory during renaming
    ];
    const done = multitest(_done, perms.length);
    perms.forEach(perm => {
      const vol = create({ '/src/test': 'test' });
      vol.mkdirSync('/dest');
      vol.chmodSync('/src', perm);
      vol.rename('/src/test', '/dest/fail', err => {
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

  it('gives EACCES when destination directory has insufficient permissions', _done => {
    const perms = [
      0o666, // rw
      0o555, // rx
    ];
    const done = multitest(_done, perms.length);
    perms.forEach(perm => {
      const vol = create({ '/src/test': 'test' });
      vol.mkdirSync('/dest', { mode: perm });
      vol.rename('/src/test', '/dest/fail', err => {
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

  it('gives EACCES when intermediate directory has insufficient permissions', done => {
    const vol = create({ '/src/test': 'test' });
    vol.mkdirSync('/dest');
    vol.chmodSync('/', 0o666); // rw
    vol.rename('/src/test', '/dest/fail', err => {
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
