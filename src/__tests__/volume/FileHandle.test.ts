import { fromStream } from '@jsonjoy.com/util/lib/streams/fromStream';
import { createFs } from '../util';

describe('FileHandle', () => {
  describe('.readableWebStream()', () => {
    it('can read contest of a file', async () => {
      const fs = createFs();
      fs.writeFileSync('/foo', 'bar');
      const handle = await fs.promises.open('/foo', 'r');
      const stream = handle.readableWebStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      const data = fromStream(stream);
      expect(await data).toEqual(Buffer.from('bar'));
    });
  });
});
