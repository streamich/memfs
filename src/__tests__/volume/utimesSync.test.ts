import { create } from '../util';

describe('utimesSync', () => {
  it('should be able to utimes files and directories regardless of their permissions', () => {
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
        vol.utimesSync('/foo', 0, 0);
      }).not.toThrow();
    });
    // Check for files
    perms.forEach(perm => {
      const vol = create({ '/foo': 'foo' });
      expect(() => {
        vol.utimesSync('/foo', 0, 0);
      }).not.toThrow();
    });
  });

  it('should set atime and mtime on a file', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.utimesSync('/foo/test', new Date(1), new Date(2));
    const { atime, mtime } = vol.statSync('/foo/test');
    expect(atime).toEqual(new Date(1));
    expect(mtime).toEqual(new Date(2));
  });

  it('should set atime and mtime on a directory', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.utimesSync('/foo', new Date(1), new Date(2));
    const { atime, mtime } = vol.statSync('/foo');
    expect(atime).toEqual(new Date(1));
    expect(mtime).toEqual(new Date(2));
  });

  it("should throw ENOENT when target doesn't exist", () => {
    const vol = create({});
    expect(() => {
      vol.utimesSync('/foo', 0, 0);
    }).toThrow(/ENOENT/);
  });

  it('should throw EACCES when containing directory has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo', 0o666); // rw
    expect(() => {
      vol.utimesSync('/foo/test', 0, 0);
    }).toThrow(/EACCES/);
  });

  it('should throw EACCES when intermediate directory has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.utimesSync('/foo/test', 0, 0);
    }).toThrow(/EACCES/);
  });
});
