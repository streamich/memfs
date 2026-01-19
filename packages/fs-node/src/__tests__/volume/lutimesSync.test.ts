import { create } from '../util';

describe('lutimesSync', () => {
  it('should be able to lutimes symlinks regardless of their permissions', () => {
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
      const vol = create({ '/target': 'test' });
      vol.symlinkSync('/target', '/test');
      expect(() => {
        vol.lutimesSync('/test', 0, 0);
      }).not.toThrow();
    });
  });

  it('should set atime and mtime on the link itself, not the target', () => {
    const vol = create({ '/target': 'test' });
    vol.symlinkSync('/target', '/test');
    vol.lutimesSync('/test', new Date(1), new Date(2));
    const linkStats = vol.lstatSync('/test');
    const targetStats = vol.statSync('/target');

    expect(linkStats.atime).toEqual(new Date(1));
    expect(linkStats.mtime).toEqual(new Date(2));

    expect(targetStats.atime).not.toEqual(new Date(1));
    expect(targetStats.mtime).not.toEqual(new Date(2));
  });

  it("should throw ENOENT when target doesn't exist", () => {
    const vol = create({ '/target': 'test' });
    // Don't create symlink this time
    expect(() => {
      vol.lutimesSync('/test', 0, 0);
    }).toThrow(/ENOENT/);
  });

  it('should throw EACCES when containing directory has insufficient permissions', () => {
    const vol = create({ '/target': 'test' });
    vol.mkdirSync('/foo');
    vol.symlinkSync('/target', '/foo/test');
    vol.chmodSync('/foo', 0o666); // rw
    expect(() => {
      vol.lutimesSync('/foo/test', 0, 0);
    }).toThrow(/EACCES/);
  });

  it('should throw EACCES when intermediate directory has insufficient permissions', () => {
    const vol = create({ '/target': 'test' });
    vol.mkdirSync('/foo');
    vol.symlinkSync('/target', '/foo/test');
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.lutimesSync('/foo/test', 0, 0);
    }).toThrow(/EACCES/);
  });
});
