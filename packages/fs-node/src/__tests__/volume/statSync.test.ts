import { create } from '../util';

describe('.statSync(...)', () => {
  it('works with symlinks, #463', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    expect(vol.statSync('/a/b/index.js').size).toBe(11);
    expect(vol.statSync('a/b/index.js').size).toBe(11);
  });

  it('returns rdev', () => {
    const vol = create({});
    const fd = vol.openSync('/null', 'w');
    vol._core.fds[fd].node.rdev = 1;
    const stats = vol.statSync('/null');
    expect(stats.rdev).toBe(1);
  });

  it('returns undefined for non-existent targets with the throwIfNoEntry option set to false', () => {
    const vol = create({});

    const stats = vol.statSync('/non-existent', { throwIfNoEntry: false });
    expect(stats).toBeUndefined();
  });

  it('throws EACCES when for a non-existent file when containing directory does not have sufficient permissions even if throwIfNoEntry option is false', () => {
    const vol = create({});
    vol.mkdirSync('/foo', { mode: 0o666 }); // rw
    expect(() => {
      vol.statSync('/foo/non-existent', { throwIfNoEntry: false });
    }).toThrowError(/EACCES/);
  });

  it('throws EACCES when containing directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo', 0o666); // rw

    expect(() => {
      vol.statSync('/foo/test');
    }).toThrowError(/EACCES/);

    // Make sure permissions win out against throwIfNoEntry option:
    expect(() => {
      vol.statSync('/foo/test', { throwIfNoEntry: false });
    }).toThrowError(/EACCES/);
  });

  it('throws EACCES when intermediate directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/', 0o666); // rw

    expect(() => {
      vol.statSync('/foo/test');
    }).toThrowError(/EACCES/);
  });
});
