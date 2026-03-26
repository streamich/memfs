import { create } from '../util';
import { AMODE } from '@jsonjoy.com/fs-node-utils';

const setup = () => {
  const vol = create({ '/test.txt': 'content' });
  vol.chmodSync('/test.txt', 0o755);
  vol.symlinkSync('/test.txt', '/test-link');
  return vol;
};

describe('promises.access', () => {
  test('F_OK follows symlink', async () => {
    const vol = setup();
    await expect(vol.promises.access('/test-link', AMODE.F_OK)).resolves.toBeUndefined();
  });

  test('R_OK follows symlink to readable target', async () => {
    const vol = setup();
    await expect(vol.promises.access('/test-link', AMODE.R_OK)).resolves.toBeUndefined();
  });

  test('W_OK follows symlink to writable target', async () => {
    const vol = setup();
    await expect(vol.promises.access('/test-link', AMODE.W_OK)).resolves.toBeUndefined();
  });

  test('X_OK follows symlink to executable target', async () => {
    const vol = setup();
    await expect(vol.promises.access('/test-link', AMODE.X_OK)).resolves.toBeUndefined();
  });

  test('R_OK through symlink to non-readable target throws EACCES', async () => {
    const vol = create({ '/secret.txt': 'nope' });
    vol.chmodSync('/secret.txt', 0o000);
    vol.symlinkSync('/secret.txt', '/secret-link');

    await expect(vol.promises.access('/secret-link', AMODE.R_OK)).rejects.toHaveProperty('code', 'EACCES');
  });

  test('W_OK through symlink to non-writable target throws EACCES', async () => {
    const vol = create({ '/readonly.txt': 'nope' });
    vol.chmodSync('/readonly.txt', 0o444);
    vol.symlinkSync('/readonly.txt', '/readonly-link');

    await expect(vol.promises.access('/readonly-link', AMODE.W_OK)).rejects.toHaveProperty('code', 'EACCES');
  });

  test('X_OK through symlink to non-executable target throws EACCES', async () => {
    const vol = create({ '/noexec.txt': 'nope' });
    vol.chmodSync('/noexec.txt', 0o644);
    vol.symlinkSync('/noexec.txt', '/noexec-link');

    await expect(vol.promises.access('/noexec-link', AMODE.X_OK)).rejects.toHaveProperty('code', 'EACCES');
  });
});
