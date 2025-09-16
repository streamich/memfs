import { create } from '../../../__tests__/util';

describe('chmodSync', () => {
  it('should be able to chmod files and directories owned by the UID regardless of their permissions', () => {
    const perms = [
      0o777, // rwx
      0o666, // rw
      0o555, // rx
      0o444, // r
      0o333, // wx
      0o222, // w
      0o111, // x
      0o000, // none
    ];
    // Check for directories
    perms.forEach(perm => {
      const vol = create({});
      vol.mkdirSync('/foo', { mode: perm });
      expect(() => {
        vol.chmodSync('/foo', 0o777);
      }).not.toThrow();
    });
    // Check for files
    perms.forEach(perm => {
      const vol = create({ '/foo': 'foo' });
      expect(() => {
        vol.chmodSync('/foo', 0o777);
      }).not.toThrow();
    });
  });

  it('should chmod the target of a symlink, not the symlink itself', () => {
    const vol = create({ '/target': 'contents' });
    vol.symlinkSync('/target', '/link');
    const expectedLink = vol.lstatSync('/link').mode;
    const expectedTarget = vol.statSync('/target').mode & ~0o777;
    vol.chmodSync('/link', 0);

    expect(vol.lstatSync('/link').mode).toEqual(expectedLink);
    expect(vol.statSync('/target').mode).toEqual(expectedTarget);
  });

  it.skip('should throw EPERM when trying to chmod targets not owned by the uid', () => {
    const uid = process.getuid!() + 1;
    // Check for directories
    const vol = create({});
    vol.mkdirSync('/foo');
    vol.chownSync('/foo', uid, process.getgid!());
    expect(() => {
      vol.chmodSync('/foo', 0o777);
    }).toThrow(/PERM/);
  });

  it("should throw ENOENT when target doesn't exist", () => {
    const vol = create({});
    expect(() => {
      vol.chmodSync('/foo', 0o777);
    }).toThrow(/ENOENT/);
  });

  it('should throw EACCES when containing directory has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo', 0o666); // rw
    expect(() => {
      vol.chmodSync('/foo/test', 0o777);
    }).toThrow(/EACCES/);
  });

  it('should throw EACCES when intermediate directory has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.chmodSync('/foo/test', 0o777);
    }).toThrow(/EACCES/);
  });
});
