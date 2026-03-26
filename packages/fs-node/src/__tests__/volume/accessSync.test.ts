import { create } from '../util';
import { AMODE } from '@jsonjoy.com/fs-node-utils';

const setup = () => {
  const vol = create({ '/test.txt': 'content' });
  vol.chmodSync('/test.txt', 0o755);
  vol.symlinkSync('/test.txt', '/test-link');
  return vol;
};

describe('accessSync', () => {
  test('F_OK follows symlink', () => {
    const vol = setup();
    vol.accessSync('/test-link', AMODE.F_OK);
  });

  test('R_OK follows symlink to readable target', () => {
    const vol = setup();
    vol.accessSync('/test-link', AMODE.R_OK);
  });

  test('W_OK follows symlink to writable target', () => {
    const vol = setup();
    vol.accessSync('/test-link', AMODE.W_OK);
  });

  test('X_OK follows symlink to executable target', () => {
    const vol = setup();
    vol.accessSync('/test-link', AMODE.X_OK);
  });

  test('R_OK through symlink to non-readable target throws EACCES', () => {
    const vol = create({ '/secret.txt': 'nope' });
    vol.chmodSync('/secret.txt', 0o000);
    vol.symlinkSync('/secret.txt', '/secret-link');

    expect(() => vol.accessSync('/secret-link', AMODE.R_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });

  test('W_OK through symlink to non-writable target throws EACCES', () => {
    const vol = create({ '/readonly.txt': 'nope' });
    vol.chmodSync('/readonly.txt', 0o444);
    vol.symlinkSync('/readonly.txt', '/readonly-link');

    expect(() => vol.accessSync('/readonly-link', AMODE.W_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });

  test('X_OK through symlink to non-executable target throws EACCES', () => {
    const vol = create({ '/noexec.txt': 'nope' });
    vol.chmodSync('/noexec.txt', 0o644);
    vol.symlinkSync('/noexec.txt', '/noexec-link');

    expect(() => vol.accessSync('/noexec-link', AMODE.X_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });
});
