import { create } from '../util';

describe('.readSync(fd, buffer, offset, length, position)', () => {
  it('Basic read file', () => {
    const vol = create({ '/test.txt': '01234567' });
    const buf = Buffer.alloc(3, 0);
    const bytes = vol.readSync(vol.openSync('/test.txt', 'r'), buf, 0, 3, 3);
    expect(bytes).toBe(3);
    expect(buf.equals(Buffer.from('345'))).toBe(true);
  });
  it('Attempt to read more than buffer space should throw ERR_OUT_OF_RANGE', () => {
    const vol = create({ '/test.txt': '01234567' });
    const buf = Buffer.alloc(3, 0);
    const fn = () => vol.readSync(vol.openSync('/test.txt', 'r'), buf, 0, 10, 3);
    expect(fn).toThrow('ERR_OUT_OF_RANGE');
  });
  xit('Read over file boundary', () => {});
  xit('Read multiple times, caret position should adjust', () => {});
  xit('Negative tests', () => {});
});
