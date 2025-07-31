import { create } from '../../../__tests__/util';

describe('.realpathSync(...)', () => {
  it('works with symlinks, #463', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const path = vol.realpathSync('/a/b/index.js');
    expect(path).toBe('/c/index.js');
  });
  it('returns the root correctly', () => {
    const vol = create({ './a': 'a' });
    expect(vol.realpathSync('/')).toBe('/');
  });
  it('throws EACCES when the containing directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/bar': 'bar' });
    vol.chmodSync('/foo', 0o666); // rw
    expect(() => {
      vol.realpathSync('/foo/bar');
    }).toThrow(/EACCES/);
  });

  it('throws EACCES when an intermediate directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/bar': 'bar' });
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.realpathSync('/foo/bar');
    }).toThrow(/EACCES/);
  });
});
