import { of } from '../../thingies';
import { memfs } from '../..';

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
    expect((<any>err).code).toBe('ENOENT');
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
