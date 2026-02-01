import { create } from '../util';

describe('readdirSync()', () => {
  it('returns a single directory', () => {
    const vol = create({
      '/foo/bar': 'baz',
    });
    const dirs = vol.readdirSync('/');

    expect(dirs).toEqual(['foo']);
  });

  it('returns multiple directories', () => {
    const vol = create({
      '/foo/bar': 'baz',
      '/tro/lo': 'lo',
      '/ab/ra': 'kadabra',
    });
    const dirs = vol.readdirSync('/');

    (dirs as any).sort();

    expect(dirs).toEqual(['ab', 'foo', 'tro']);
  });

  it('returns empty array when dir empty', () => {
    const vol = create({});
    const dirs = vol.readdirSync('/');

    expect(dirs).toEqual([]);
  });

  it('reads relative dir', () => {
    const vol = create({
      '/foo/bar/file': 'content',
      '/foo/bar/file2': 'content2',
    }, '/foo');
    const files = vol.readdirSync('bar');

    expect(files).toEqual(["file", "file2"]);
  });

  it('respects symlinks', () => {
    const vol = create({
      '/a/a': 'a',
      '/a/aa': 'aa',
      '/b/b': 'b',
    });
    vol.symlinkSync('/a', '/lnk');

    const dirs = vol.readdirSync('/lnk');

    (dirs as any).sort();

    expect(dirs).toEqual(['a', 'aa']);
  });

  it('respects recursive symlinks', () => {
    const vol = create({});

    vol.symlinkSync('/', '/foo');

    const dirs = vol.readdirSync('/foo');

    expect(dirs).toEqual(['foo']);
  });

  it('accepts option {withFileTypes: true}', () => {
    const vol = create({
      '/x/af': 'a',
      '/x/b/bf': 'b',
      '/x/c/c/cf': 'c',
    });
    const all = vol.readdirSync('/x', { withFileTypes: true });
    const mapped = all.map(dirent => {
      return { ...(dirent as any) };
    });
    expect(mapped).toEqual([
      { mode: 33206, name: 'af', parentPath: '/x', path: '/x' },
      { mode: 16895, name: 'b', parentPath: '/x', path: '/x' },
      { mode: 16895, name: 'c', parentPath: '/x', path: '/x' },
    ]);
  });

  it('accepts option {recursive: true}', () => {
    const vol = create({
      '/y/af1': 'a',
      '/y/af2': 'a',
      '/y/b/bf1': 'b',
      '/y/b/bf2': 'b',
      '/y/c/c/.cf0': 'c',
      '/y/c/c/cf1': 'c',
      '/y/c/c/cf2': 'c',
    });
    const all = vol.readdirSync('/y', { recursive: true });
    (all as any).sort();
    expect(all).toEqual(['af1', 'af2', 'b', 'b/bf1', 'b/bf2', 'c', 'c/c', 'c/c/.cf0', 'c/c/cf1', 'c/c/cf2']);
  });

  it('accepts option {recursive: true, withFileTypes: true}', () => {
    const vol = create({
      '/z/af1': 'a',
      '/z/af2': 'a',
      '/z/b/bf1': 'b',
      '/z/b/bf2': 'b',
      '/z/c/c/.cf0': 'c',
      '/z/c/c/cf1': 'c',
      '/z/c/c/cf2': 'c',
    });
    const all = vol.readdirSync('/z', { recursive: true, withFileTypes: true });
    const mapped = all
      .map(dirent => {
        return { ...(dirent as any) };
      })
      .sort((a, b) => a.parentPath.localeCompare(b.parentPath));
    expect(mapped).toEqual([
      { mode: 33206, name: 'af1', parentPath: '/z', path: '/z' },
      { mode: 33206, name: 'af2', parentPath: '/z', path: '/z' },
      { mode: 16895, name: 'b', parentPath: '/z', path: '/z' },
      { mode: 16895, name: 'c', parentPath: '/z', path: '/z' },
      { mode: 33206, name: 'bf1', parentPath: '/z/b', path: '/z/b' },
      { mode: 33206, name: 'bf2', parentPath: '/z/b', path: '/z/b' },
      { mode: 16895, name: 'c', parentPath: '/z/c', path: '/z/c' },
      { mode: 33206, name: '.cf0', parentPath: '/z/c/c', path: '/z/c/c' },
      { mode: 33206, name: 'cf1', parentPath: '/z/c/c', path: '/z/c/c' },
      { mode: 33206, name: 'cf2', parentPath: '/z/c/c', path: '/z/c/c' },
    ]);
  });

  it('throws EACCES when trying to readdirSync a directory with insufficient permissions', () => {
    const vol = create({});
    vol.mkdirSync('/foo', { mode: 0o333 }); // wx across the board
    expect(() => {
      vol.readdirSync('/foo');
    }).toThrowError(/EACCES/);
    // Check that it also throws with one of the subdirs of a recursive scan
    expect(() => {
      vol.readdirSync('/', { recursive: true });
    }).toThrowError(/EACCES/);
  });
});
