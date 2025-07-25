import { create } from '../util';

describe('cp(src, dest[, options], callback)', () => {
  it('method exists', () => {
    const vol = create();
    expect(typeof vol.cp).toBe('function');
  });

  it('copies a file', done => {
    const vol = create({
      '/foo.txt': 'hello world',
    });

    expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
    expect(() => {
      vol.readFileSync('/bar.txt', 'utf8');
    }).toThrow();

    vol.cp('/foo.txt', '/bar.txt', err => {
      expect(err).toBeFalsy();

      expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
      expect(vol.readFileSync('/bar.txt', 'utf8')).toBe('hello world');
      done();
    });
  });

  it('copies a directory with recursive option', done => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
      '/src/subdir/file3.txt': 'content3',
    });

    vol.cp('/src', '/dest', { recursive: true }, err => {
      expect(err).toBeFalsy();

      expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
      expect(vol.readFileSync('/dest/file2.txt', 'utf8')).toBe('content2');
      expect(vol.readFileSync('/dest/subdir/file3.txt', 'utf8')).toBe('content3');
      done();
    });
  });

  it('throws error when copying directory without recursive option', done => {
    const vol = create({
      '/src/file.txt': 'content',
    });

    vol.cp('/src', '/dest', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EISDIR');
      done();
    });
  });

  it('respects filter option', done => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
    });

    const filter = (src: string) => !src.includes('file2');

    vol.cp('/src', '/dest', { recursive: true, filter }, err => {
      expect(err).toBeFalsy();

      expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
      expect(() => {
        vol.readFileSync('/dest/file2.txt', 'utf8');
      }).toThrow();
      done();
    });
  });

  it('handles force option', done => {
    const vol = create({
      '/src.txt': 'source',
      '/dest.txt': 'destination',
    });

    vol.cp('/src.txt', '/dest.txt', { force: false }, err => {
      expect(err).toBeFalsy();
      expect(vol.readFileSync('/dest.txt', 'utf8')).toBe('destination');
      done();
    });
  });

  it('handles errorOnExist option', done => {
    const vol = create({
      '/src.txt': 'source',
      '/dest.txt': 'destination',
    });

    vol.cp('/src.txt', '/dest.txt', { errorOnExist: true }, err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EEXIST');
      done();
    });
  });
});
