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

  it('respects symlinks', () => {
    const vol = create({
      '/a/a': 'a',
      '/a/aa': 'aa',
      '/b/b': 'b',
    });

    vol.symlinkSync('/a', '/b/b/b');

    const dirs = vol.readdirSync('/b/b/b');

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
      return { ...dirent };
    });
    expect(mapped).toEqual([
      { mode: 33206, name: 'af', path: '/x', parentPath: '/x' },
      { mode: 16895, name: 'b', path: '/x', parentPath: '/x' },
      { mode: 16895, name: 'c', path: '/x', parentPath: '/x' },
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
        return { ...dirent };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
    expect(mapped).toEqual([
      { mode: 33206, name: 'af1', path: '/z', parentPath: '/z' },
      { mode: 33206, name: 'af2', path: '/z', parentPath: '/z' },
      { mode: 16895, name: 'b', path: '/z', parentPath: '/z' },
      { mode: 16895, name: 'c', path: '/z', parentPath: '/z' },
      { mode: 33206, name: 'bf1', path: '/z/b', parentPath: '/z/b' },
      { mode: 33206, name: 'bf2', path: '/z/b', parentPath: '/z/b' },
      { mode: 16895, name: 'c', path: '/z/c', parentPath: '/z/c' },
      { mode: 33206, name: '.cf0', path: '/z/c/c', parentPath: '/z/c/c' },
      { mode: 33206, name: 'cf1', path: '/z/c/c', parentPath: '/z/c/c' },
      { mode: 33206, name: 'cf2', path: '/z/c/c', parentPath: '/z/c/c' },
    ]);
  });
});
