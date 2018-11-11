import { create } from '../util';

describe('renameSync(fromPath, toPath)', () => {
  it('Renames a file', () => {
    const vol = create({ '/foo': 'bar' });
    expect(
      vol.root
        .getChild('foo')
        .getNode()
        .isFile(),
    ).toBe(true);
    vol.renameSync('/foo', '/baz');
    expect(vol.root.getChild('foo')).toBeUndefined();
    expect(
      vol.root
        .getChild('baz')
        .getNode()
        .isFile(),
    ).toBe(true);
    expect(vol.readFileSync('/baz', 'utf8')).toBe('bar');
  });
  it('Rename file two levels deep', () => {
    const vol = create({ '/1/2': 'foobar' });
    vol.renameSync('/1/2', '/1/3');
    expect(vol.toJSON()).toEqual({ '/1/3': 'foobar' });
  });
  it('Rename file three levels deep', () => {
    const vol = create({
      '/foo1': 'bar',
      '/foo2/foo': 'bar',
      '/foo3/foo/foo': 'bar',
    });
    vol.renameSync('/foo3/foo/foo', '/foo3/foo/foo2');
    expect(vol.toJSON()).toEqual({
      '/foo1': 'bar',
      '/foo2/foo': 'bar',
      '/foo3/foo/foo2': 'bar',
    });
  });
  it('Throws on no params', () => {
    const vol = create();
    expect(() => {
      (vol as any).renameSync();
    }).toThrowErrorMatchingSnapshot();
  });
  it('Throws on only one param', () => {
    const vol = create({ '/foo': 'bar' });
    expect(() => {
      (vol as any).renameSync('/foo');
    }).toThrowErrorMatchingSnapshot();
  });
  it('Throws if path is of wrong type', () => {
    const vol = create({ '/foo': 'bar' });
    expect(() => {
      (vol as any).renameSync('/foo', 123);
    }).toThrowErrorMatchingSnapshot();
  });
});
