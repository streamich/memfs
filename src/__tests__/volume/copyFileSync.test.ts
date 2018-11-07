import { create } from '../util';
import { constants } from '../../constants';

describe('copyFileSync(src, dest[, flags])', () => {
  it('method exists', () => {
    const vol = create();

    expect(typeof vol.copyFileSync).toBe('function');
  });

  it('throws on incorrect path arguments', () => {
    const vol = create();

    expect(() => {
      (vol as any).copyFileSync();
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync(1);
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync(1, 2);
    }).toThrow();

    expect(() => {
      (vol as any).copyFileSync({}, {});
    }).toThrow();
  });

  it('copies file', () => {
    const vol = create({
      '/foo': 'hello world',
    });

    vol.copyFileSync('/foo', '/bar');

    expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
  });

  describe('when COPYFILE_EXCL flag set', () => {
    it('should copy file, if destination does not exit', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      vol.copyFileSync('/foo', '/bar', constants.COPYFILE_EXCL);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });

    it('should throw, if file already exists', () => {
      const vol = create({
        '/foo': 'hello world',
        '/bar': 'no hello',
      });

      expect(() => {
        vol.copyFileSync('/foo', '/bar', constants.COPYFILE_EXCL);
      }).toThrowError(/EEXIST/);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('no hello');
    });
  });

  describe('when COPYFILE_FICLONE flag set', () => {
    it('copies file', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      vol.copyFileSync('/foo', '/bar', constants.COPYFILE_FICLONE);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });
  });

  describe('when COPYFILE_FICLONE_FORCE flag set', () => {
    it('always fails with ENOSYS', () => {
      const vol = create({
        '/foo': 'hello world',
      });

      expect(() => {
        vol.copyFileSync('/foo', '/bar', constants.COPYFILE_FICLONE_FORCE);
      }).toThrowError(/ENOSYS/);

      expect(vol.readFileSync('/foo', 'utf8')).toBe('hello world');
    });
  });
});
