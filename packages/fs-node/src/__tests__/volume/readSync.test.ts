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
    let error: any;
    try {
      fn();
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(RangeError);
    expect(error.code).toBe('ERR_OUT_OF_RANGE');
    expect(error.message).toBe('The value of "length" is out of range. It must be <= 3. Received 10');
  });

  it('counts offset into the ERR_OUT_OF_RANGE check', () => {
    const vol = create({ '/test.txt': '01234567' });
    const buf = Buffer.alloc(3, 0);
    const fn = () => vol.readSync(vol.openSync('/test.txt', 'r'), buf, 2, 3, 0);
    expect(fn).toThrow('The value of "length" is out of range. It must be <= 1. Received 3');
  });

  it('rejects a negative offset like Node', () => {
    const vol = create({ '/test.txt': '01234567' });
    const fn = () => vol.readSync(vol.openSync('/test.txt', 'r'), Buffer.alloc(3), -1, 1, 0);
    expect(fn).toThrow('The value of "offset" is out of range. It must be >= 0 && <= 9007199254740991. Received -1');
  });

  it('rejects a negative length like Node', () => {
    const vol = create({ '/test.txt': '01234567' });
    const fn = () => vol.readSync(vol.openSync('/test.txt', 'r'), Buffer.alloc(3), 0, -1, 0);
    expect(fn).toThrow('The value of "length" is out of range. It must be >= 0. Received -1');
  });

  it('returns 0 for a zero length before any range check', () => {
    const vol = create({ '/test.txt': '01234567' });
    expect(vol.readSync(vol.openSync('/test.txt', 'r'), Buffer.alloc(3), 4, 0, 0)).toBe(0);
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

  it('Read into Uint8Array with non-zero byteOffset', () => {
    const vol = create({ '/test.txt': '01234567' });
    const largerBuffer = new ArrayBuffer(20);
    const uint8View = new Uint8Array(largerBuffer, 10, 5); // offset=10, length=5
    const fd = vol.openSync('/test.txt', 'r');
    const bytes = vol.readSync(fd, uint8View, 0, 5, 0);
    expect(bytes).toBe(5);
    expect(new TextDecoder().decode(uint8View)).toBe('01234');
  });

  xit('Negative tests', () => {});

  /*
   * No need for permissions tests, because readSync requires a file descriptor, which can only be
   * obtained from open or openSync.
   */
});
