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
  it('Read over file boundary', () => {
    const vol = create({ '/test.txt': '01234567' });
    const buf = Buffer.alloc(3, 0);
    const bytes = vol.readSync(vol.openSync('/test.txt', 'r'), buf, 0, 3, 6);
    expect(bytes).toBe(2);
    expect(buf.equals(Buffer.from('67\0'))).toBe(true);
  });
  it('Read multiple times, caret position should adjust', () => {
    const vol = create({ '/test.txt': '01234567' });
    const buf = Buffer.alloc(3, 0);
    const fd = vol.openSync('/test.txt', 'r');
    let bytes = vol.readSync(fd, buf, 0, 3, null);
    expect(bytes).toBe(3);
    expect(buf.equals(Buffer.from('012'))).toBe(true);
    bytes = vol.readSync(fd, buf, 0, 3, null);
    expect(bytes).toBe(3);
    expect(buf.equals(Buffer.from('345'))).toBe(true);
    bytes = vol.readSync(fd, buf, 0, 3, null);
    expect(bytes).toBe(2);
    expect(buf.equals(Buffer.from('675'))).toBe(true);
    bytes = vol.readSync(fd, buf, 0, 3, null);
    expect(bytes).toBe(0);
    expect(buf.equals(Buffer.from('675'))).toBe(true);
  });
  xit('Negative tests', () => {});
});
