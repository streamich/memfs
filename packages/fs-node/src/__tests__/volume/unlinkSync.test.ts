import { create } from '../util';

describe('unlinkSync', () => {
  it('removes a file', () => {
    const vol = create({
      '/foo.txt': 'bar',
      '/baz.txt': 'qux',
    });
    vol.unlinkSync('/foo.txt');
    expect(vol.toJSON()).toEqual({
      '/baz.txt': 'qux',
    });
  });

  it('throws ENOENT when file does not exist', () => {
    const vol = create({
      '/foo.txt': 'bar',
    });
    expect(() => vol.unlinkSync('/bar.txt')).toThrowError(
      new Error("ENOENT: no such file or directory, unlink '/bar.txt'"),
    );
  });

  describe('when path is a directory', () => {
    it('throws EPERM for an empty directory', () => {
      const vol = create({});
      vol.mkdirSync('/dir');
      expect(() => vol.unlinkSync('/dir')).toThrowError(new Error("EPERM: operation not permitted, unlink '/dir'"));
      expect(vol.existsSync('/dir')).toBe(true);
    });

    it('throws EPERM for a non-empty directory', () => {
      const vol = create({
        '/dir/foo.txt': 'bar',
      });
      expect(() => vol.unlinkSync('/dir')).toThrowError(new Error("EPERM: operation not permitted, unlink '/dir'"));
      expect(vol.toJSON()).toEqual({
        '/dir/foo.txt': 'bar',
      });
    });

    it('throws EPERM for the root directory', () => {
      const vol = create({
        '/foo.txt': 'bar',
      });
      expect(() => vol.unlinkSync('/')).toThrowError(new Error("EPERM: operation not permitted, unlink '/'"));
    });

    it('has an EPERM error code', () => {
      const vol = create({});
      vol.mkdirSync('/dir');
      try {
        vol.unlinkSync('/dir');
        throw new Error('not this error');
      } catch (error) {
        expect(error.code).toBe('EPERM');
        expect(error.path).toBe('/dir');
      }
    });

    it('removes a symlink pointing to a directory', () => {
      const vol = create({
        '/dir/foo.txt': 'bar',
      });
      vol.symlinkSync('/dir', '/link');
      vol.unlinkSync('/link');
      expect(vol.existsSync('/link')).toBe(false);
      expect(vol.existsSync('/dir')).toBe(true);
    });
  });

  it('async unlink of a directory returns EPERM', done => {
    const vol = create({});
    vol.mkdirSync('/dir');
    vol.unlink('/dir', err => {
      expect((err as any).code).toBe('EPERM');
      expect(vol.existsSync('/dir')).toBe(true);
      done();
    });
  });

  it('promises unlink of a directory rejects with EPERM', async () => {
    const vol = create({});
    vol.mkdirSync('/dir');
    await expect(vol.promises.unlink('/dir')).rejects.toThrowError(
      new Error("EPERM: operation not permitted, unlink '/dir'"),
    );
  });
});
