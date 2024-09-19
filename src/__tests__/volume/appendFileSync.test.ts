import { create } from '../util';

describe('appendFileSync(file, data, options)', () => {
  it('Simple write to non-existing file', () => {
    const vol = create();
    vol.appendFileSync('/test', 'hello');
    expect(vol.readFileSync('/test', 'utf8')).toEqual('hello');
  });
  it('Append to existing file', () => {
    const vol = create({ '/a': 'b' });
    vol.appendFileSync('/a', 'c');
    expect(vol.readFileSync('/a', 'utf8')).toEqual('bc');
  });
  it('Appending throws EACCES without sufficient permissions on the file', () => {
    const vol = create({ '/foo': 'foo' });
    vol.chmodSync('/foo', 0o555); // rx across the board
    expect(() => {
      vol.appendFileSync('/foo', 'bar');
    }).toThrowError(/EACCES/);
  });
  it('Appending throws EACCES if file does not exist and containing directory has insufficient permissions', () => {
    const perms = [
      0o555, // rx across the board
      // 0o666, // rw across the board
      // 0o111, // x
      // 0o222  // w
    ];
    perms.forEach(perm => {
      const vol = create({});
      vol.mkdirSync('/foo', perm);
      expect(() => {
        vol.appendFileSync('/foo/test', 'bar');
      }).toThrowError(/EACCES/);
    });
  });
  it('Appending throws EACCES if intermediate directory has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.appendFileSync('/foo/test', 'bar');
    }).toThrowError(/EACCES/);
  });
});
