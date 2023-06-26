import { of } from 'thingies';
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
});
