import { create } from '../util';
import { constants } from '../../constants';

describe('copyFile(src, dest[, flags], callback)', () => {
  it('method exists', () => {
    const vol = create();

    expect(typeof vol.copyFile).toBe('function');
  });

  it('copies a file', done => {
    const vol = create({
      '/foo': 'hello world',
    });

    expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
    expect(() => {
      vol.readFileSync('/bar', 'utf8');
    }).toThrow();

    vol.copyFile('/foo', '/bar', (err, result) => {
      expect(!!err).toBe(false);
      expect(result).toBe(undefined);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
      done();
    });
  });

  it('honors COPYFILE_EXCL flag', done => {
    const vol = create({
      '/foo': 'hello world',
      '/bar': 'already exists',
    });

    vol.copyFile('/foo', '/bar', constants.COPYFILE_EXCL, (err, result) => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('message', expect.stringContaining('EEXIST'));
      expect(result).toBe(undefined);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('already exists');
      done();
    });
  });
});
