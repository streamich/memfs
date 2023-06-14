import { create } from '../util';
import { memfs } from '../..';

describe('.writeSync(fd, buffer, offset, length, position)', () => {;
  it('Write binary data to file', () => {
    const vol = create({});
    const fd = vol.openSync('/data.bin', 'w+');
    const bytes = vol.writeSync(fd, Buffer.from([1, 2, 3]));
    vol.closeSync(fd);
    expect(bytes).toBe(3);
    expect(Buffer.from([1, 2, 3]).equals(vol.readFileSync('/data.bin') as Buffer)).toBe(true);
  });
  
  it('Write string to file', () => {
    const vol = create({});
    const fd = vol.openSync('/foo', 'w');
    vol.writeSync(fd, 'test');
    expect(vol.toJSON()).toMatchSnapshot();
  });

  it('can write at offset', () => {
    const fs = memfs({foo: '123'});
    const fd = fs.openSync('/foo', 'a+');
    expect(fs.readFileSync('/foo', 'utf8')).toBe('123');
    fs.writeSync(fd, 'x', 1);
    expect(fs.readFileSync('/foo', 'utf8')).toBe('1x3');
  });
});
