import { create } from '../util';

describe('existsSync(path)', () => {
  const vol = create();
  it('Returns true if file exists', () => {
    const result = vol.existsSync('/foo');
    expect(result).toEqual(true);
  });
  it('Returns false if file does not exist', () => {
    const result = vol.existsSync('/foo2');
    expect(result).toEqual(false);
  });
  it('invalid path type should not throw', () => {
    expect(vol.existsSync(123 as any)).toEqual(false);
  });
  it('returns false if permissions are insufficient on containing directory', () => {
    // Experimentally determined: fs.existsSync treats missing permissions as "file does not exist",
    // even though it could throw EACCES instead.
    // This is presumably to achieve unity of behavior with fs.exists.
    const vol = create({ '/foo/bar': 'test' });
    vol.chmodSync('/foo', 0o666); // rw across the board
    expect(vol.existsSync('/foo/bar')).toEqual(false);
  });
});
