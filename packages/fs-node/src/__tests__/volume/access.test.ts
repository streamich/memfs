import { create } from '../util';
import { AMODE } from '@jsonjoy.com/fs-node-utils';

const setup = () => {
  const vol = create({ '/test.txt': 'content' });
  vol.chmodSync('/test.txt', 0o755);
  vol.symlinkSync('/test.txt', '/test-link');
  return vol;
};

describe('access', () => {
  test('F_OK follows symlink', done => {
    const vol = setup();
    vol.access('/test-link', AMODE.F_OK, err => {
      try {
        expect(err).toBeNull();
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('R_OK follows symlink to readable target', done => {
    const vol = setup();
    vol.access('/test-link', AMODE.R_OK, err => {
      try {
        expect(err).toBeNull();
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('W_OK follows symlink to writable target', done => {
    const vol = setup();
    vol.access('/test-link', AMODE.W_OK, err => {
      try {
        expect(err).toBeNull();
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('X_OK follows symlink to executable target', done => {
    const vol = setup();
    vol.access('/test-link', AMODE.X_OK, err => {
      try {
        expect(err).toBeNull();
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('R_OK through symlink to non-readable target throws EACCES', done => {
    const vol = create({ '/secret.txt': 'nope' });
    vol.chmodSync('/secret.txt', 0o000);
    vol.symlinkSync('/secret.txt', '/secret-link');

    vol.access('/secret-link', AMODE.R_OK, err => {
      try {
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('W_OK through symlink to non-writable target throws EACCES', done => {
    const vol = create({ '/readonly.txt': 'nope' });
    vol.chmodSync('/readonly.txt', 0o444);
    vol.symlinkSync('/readonly.txt', '/readonly-link');

    vol.access('/readonly-link', AMODE.W_OK, err => {
      try {
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });

  test('X_OK through symlink to non-executable target throws EACCES', done => {
    const vol = create({ '/noexec.txt': 'nope' });
    vol.chmodSync('/noexec.txt', 0o644);
    vol.symlinkSync('/noexec.txt', '/noexec-link');

    vol.access('/noexec-link', AMODE.X_OK, err => {
      try {
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });
});
