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
      '/x/a': 'a',
      '/x/b/b': 'b',
      '/x/c/c/c': 'c',
    });
    const all = vol.readdirSync('/x', { withFileTypes: true });
    const mapped = all.map((dirent) => { return {...dirent} })
    expect(mapped).toEqual([
      { mode: 33206, name: 'a', path: '/x/a' },
      { mode: 16895, name: 'b', path: '/x/b' },
      { mode: 16895, name: 'c', path: '/x/c' },
    ]);
  });
  
  it('accepts option {recursive: true}', () => {
    const vol = create({
      '/y/a': 'a',
      '/y/b/b': 'b',
      '/y/c/c/c': 'c',
    });
    const all = vol.readdirSync('/y', { recursive: true });
    (all as any).sort();
    expect(all).toEqual(['a', 'b', 'b/b', 'c', 'c/c', 'c/c/c']);
  });

  it('accepts option {recursive: true, withFileTypes: true}', () => {
    const vol = create({
      '/z/a': 'a',
      '/z/b/b': 'b',
      '/z/c/c/c': 'c',
    });
    const all = vol.readdirSync('/z', { recursive: true });
    (all as any).sort();
    expect(all).toEqual(['a/a', 'a/b', 'a/b/b', 'a/c', 'a/c/c', 'a/c/c/c']);
  });

});
