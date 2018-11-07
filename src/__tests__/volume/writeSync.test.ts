import { create } from '../util';
import { Volume } from '../../volume';

describe('.writeSync(fd, buffer, offset, length, position)', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = create({});
  });

  it('Write binary data to file', () => {
    const fd = vol.openSync('/data.bin', 'w+');
    const bytes = vol.writeSync(fd, Buffer.from([1, 2, 3]));
    vol.closeSync(fd);
    expect(bytes).toBe(3);
    expect(Buffer.from([1, 2, 3]).equals(vol.readFileSync('/data.bin') as Buffer)).toBe(true);
  });
  it('Write string to file', () => {
    const fd = vol.openSync('/foo', 'w');
    vol.writeSync(fd, 'test');
    expect(vol.toJSON()).toMatchSnapshot();
  });
});
