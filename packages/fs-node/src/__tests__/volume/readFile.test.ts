import { of } from 'thingies';
import { memfs } from '../util';
import { constants } from '@jsonjoy.com/fs-node-utils';

const { O_RDONLY, O_NOFOLLOW } = constants;

describe('.readFile()', () => {
  it('can read a file', async () => {
    const { fs } = memfs({ '/dir/test.txt': '01234567' });
    const data = await fs.promises.readFile('/dir/test.txt', { encoding: 'utf8' });
    expect(data).toBe('01234567');
  });

  it('throws if file does not exist', async () => {
    const { fs } = memfs({ '/dir/test.txt': '01234567' });
    const [, err] = await of(fs.promises.readFile('/dir/test-NOT-FOUND.txt', { encoding: 'utf8' }));
    expect(err).toBeInstanceOf(Error);
    expect((err as any).code).toBe('ENOENT');
  });

  it('throws EACCES if file has insufficient permissions', async () => {
    const { fs } = memfs({ '/foo': 'test' });
    fs.chmodSync('/foo', 0o333); // wx
    return expect(fs.promises.readFile('/foo')).rejects.toThrow(/EACCES/);
  });

  it('throws EACCES if containing directory has insufficient permissions', async () => {
    const { fs } = memfs({ '/foo/bar': 'test' });
    fs.chmodSync('/foo', 0o666); // rw
    return expect(fs.promises.readFile('/foo/bar')).rejects.toThrow(/EACCES/);
  });

  it('throws EACCES if intermediate directory has insufficient permissions', async () => {
    const { fs } = memfs({ '/foo/bar': 'test' });
    fs.chmodSync('/', 0o666); // rw
    return expect(fs.promises.readFile('/foo/bar')).rejects.toThrow(/EACCES/);
  });

  it('accepts a numeric flag', async () => {
    const { fs } = memfs({ '/foo': 'hello' });
    const data = await fs.promises.readFile('/foo', { flag: O_RDONLY | O_NOFOLLOW, encoding: 'utf8' });
    expect(data).toBe('hello');
  });

  it('rejects with ELOOP when a numeric O_NOFOLLOW flag meets a symlink', async () => {
    const { fs } = memfs({ '/foo': 'hello' });
    fs.symlinkSync('/foo', '/link');
    return expect(fs.promises.readFile('/link', { flag: O_RDONLY | O_NOFOLLOW })).rejects.toHaveProperty(
      'code',
      'ELOOP',
    );
  });

  it('rejects with ELOOP, not EISDIR, when O_NOFOLLOW meets a symlink to a directory', async () => {
    const { fs } = memfs({ '/dir/file': 'x' });
    fs.symlinkSync('/dir', '/dirlink');
    return expect(fs.promises.readFile('/dirlink', { flag: O_RDONLY | O_NOFOLLOW })).rejects.toHaveProperty(
      'code',
      'ELOOP',
    );
  });

  it('accepts a numeric flag in the callback form', done => {
    const { fs } = memfs({ '/foo': 'hello' });
    fs.readFile('/foo', { flag: O_RDONLY | O_NOFOLLOW, encoding: 'utf8' }, (err, data) => {
      expect(err).toBeFalsy();
      expect(data).toBe('hello');
      done();
    });
  });
});

describe('.readFileSync()', () => {
  it('throws ENOTDIR when reading file with trailing slash', () => {
    const { fs } = memfs({ '/foo': 'hello' });

    // Reading file without trailing slash should work
    expect(fs.readFileSync('/foo', 'utf8')).toBe('hello');

    // Reading file with trailing slash should throw ENOTDIR
    expect(() => fs.readFileSync('/foo/', 'utf8')).toThrow(/ENOTDIR/);
  });

  it('throws EISDIR when reading directory with or without trailing slash', () => {
    const { fs } = memfs({ '/dir/file.txt': 'content' });

    // Reading directory without trailing slash should throw EISDIR
    expect(() => fs.readFileSync('/dir', 'utf8')).toThrow(/EISDIR/);

    // Reading directory with trailing slash should throw EISDIR
    expect(() => fs.readFileSync('/dir/', 'utf8')).toThrow(/EISDIR/);
  });

  it('handles root path correctly', () => {
    const { fs } = memfs({});

    // Root path without trailing slash should throw EISDIR
    expect(() => fs.readFileSync('/', 'utf8')).toThrow(/EISDIR/);

    // Root path with trailing slash should also throw EISDIR
    expect(() => fs.readFileSync('/', 'utf8')).toThrow(/EISDIR/);
  });

  it('accepts a numeric flag', () => {
    const { fs } = memfs({ '/foo': 'hello' });
    expect(fs.readFileSync('/foo', { flag: O_RDONLY | O_NOFOLLOW, encoding: 'utf8' })).toBe('hello');
  });

  it('throws ELOOP when a numeric O_NOFOLLOW flag meets a symlink', () => {
    const { fs } = memfs({ '/foo': 'hello' });
    fs.symlinkSync('/foo', '/link');
    expect(() => fs.readFileSync('/link', { flag: O_RDONLY | O_NOFOLLOW })).toThrow(
      expect.objectContaining({ code: 'ELOOP' }),
    );
  });

  it('throws ELOOP, not EISDIR, when O_NOFOLLOW meets a symlink to a directory', () => {
    const { fs } = memfs({ '/dir/file': 'x' });
    fs.symlinkSync('/dir', '/dirlink');
    expect(() => fs.readFileSync('/dirlink', { flag: O_RDONLY | O_NOFOLLOW })).toThrow(
      expect.objectContaining({ code: 'ELOOP', path: '/dirlink' }),
    );
    expect(() => fs.readFileSync('/dirlink/', { flag: O_RDONLY | O_NOFOLLOW })).toThrow(
      expect.objectContaining({ code: 'EISDIR', path: '/dirlink/' }),
    );
  });

  it('reports the path as given', () => {
    const { fs } = memfs({ '/foo': 'hello', '/dir/file': 'x' });
    fs.symlinkSync('/dir', '/dirlink');
    expect(() => fs.readFileSync('/foo/')).toThrow(expect.objectContaining({ code: 'ENOTDIR', path: '/foo/' }));
    expect(() => fs.readFileSync('/dirlink/')).toThrow(expect.objectContaining({ code: 'EISDIR', path: '/dirlink/' }));
  });

  it('throws EISDIR for a directory fd', () => {
    const { fs } = memfs({ '/dir/file': 'x' });
    const fd = fs.openSync('/dir', 'r');
    expect(() => fs.readFileSync(fd)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
    fs.closeSync(fd);
  });
});
