import { of } from 'thingies';
import { memfs } from '../../../';

describe('.readFile()', () => {
  it('can read a file in cwd', async () => {
    const { fs } = memfs({ 'test.txt': '01234567' }, '/dir');
    await expect(fs.promises.readFile('/dir/test.txt', { encoding: 'utf8' })).resolves.toBe('01234567');
  });

  it('can read a relative file in cwd', async () => {
    const { fs } = memfs({ 'test.txt': '01234567' }, '/dir');
    await expect(fs.promises.readFile('test.txt', { encoding: 'utf8' })).resolves.toBe('01234567');
    await expect(fs.promises.readFile('./test.txt', { encoding: 'utf8' })).resolves.toBe('01234567');
  });

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
});
