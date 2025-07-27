import { create } from '../util';

describe('.realpath.native(...)', () => {
  it('works with async callback', done => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    vol.realpath.native('/a/b/index.js', (err, path) => {
      expect(err).toBe(null);
      expect(path).toBe('/c/index.js');
      done();
    });
  });

  it('works with async callback and options', done => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    vol.realpath.native('/a/b/index.js', 'utf8', (err, path) => {
      expect(err).toBe(null);
      expect(path).toBe('/c/index.js');
      done();
    });
  });

  it('works with async callback and options object', done => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    vol.realpath.native('/a/b/index.js', { encoding: 'utf8' }, (err, path) => {
      expect(err).toBe(null);
      expect(path).toBe('/c/index.js');
      done();
    });
  });

  it('returns the root correctly', done => {
    const vol = create({ './a': 'a' });
    vol.realpath.native('/', (err, path) => {
      expect(err).toBe(null);
      expect(path).toBe('/');
      done();
    });
  });

  it('handles errors correctly', done => {
    const vol = create({});
    vol.realpath.native('/nonexistent', (err, path) => {
      expect(err).toBeTruthy();
      expect(err?.code).toBe('ENOENT');
      expect(path).toBeUndefined();
      done();
    });
  });
});

describe('.realpathSync.native(...)', () => {
  it('works with symlinks', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const path = vol.realpathSync.native('/a/b/index.js');
    expect(path).toBe('/c/index.js');
  });

  it('works with options string', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const path = vol.realpathSync.native('/a/b/index.js', 'utf8');
    expect(path).toBe('/c/index.js');
  });

  it('works with options object', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const path = vol.realpathSync.native('/a/b/index.js', { encoding: 'utf8' });
    expect(path).toBe('/c/index.js');
  });

  it('returns the root correctly', () => {
    const vol = create({ './a': 'a' });
    expect(vol.realpathSync.native('/')).toBe('/');
  });

  it('throws EACCES when the containing directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/bar': 'bar' });
    vol.chmodSync('/foo', 0o666); // rw
    expect(() => {
      vol.realpathSync.native('/foo/bar');
    }).toThrow(/EACCES/);
  });

  it('throws EACCES when an intermediate directory does not have sufficient permissions', () => {
    const vol = create({ '/foo/bar': 'bar' });
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.realpathSync.native('/foo/bar');
    }).toThrow(/EACCES/);
  });

  it('throws ENOENT for non-existent paths', () => {
    const vol = create({});
    expect(() => {
      vol.realpathSync.native('/nonexistent');
    }).toThrow(/ENOENT/);
  });
});
