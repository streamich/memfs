import { create } from '../util';

describe('rmSync', () => {
  it('remove directory with two files', () => {
    const vol = create({
      '/foo/bar': 'baz',
      '/foo/baz': 'qux',
      '/oof': 'zab',
    });

    vol.rmSync('/foo', { force: true, recursive: true });

    expect(vol.toJSON()).toEqual({
      '/oof': 'zab',
    });
  });

  it('removes a single file', () => {
    const vol = create({
      '/a/b/c.txt': 'content',
    });

    vol.rmSync('/a/b/c.txt');

    expect(vol.toJSON()).toEqual({
      '/a/b': null,
    });
  });

  describe('when file does not exist', () => {
    it('throws by default', () => {
      const vol = create({
        '/foo.txt': 'content',
      });

      expect(() => vol.rmSync('/bar.txt')).toThrowError(
        new Error("ENOENT: no such file or directory, stat '/bar.txt'"),
      );
    });

    it('does not throw if "force" is set to true', () => {
      const vol = create({
        '/foo.txt': 'content',
      });

      vol.rmSync('/bar.txt', { force: true });
    });
  });

  describe('when deleting a directory', () => {
    it('throws by default', () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      expect(() => vol.rmSync('/usr/bin')).toThrowError(
        new Error('[ERR_FS_EISDIR]: Path is a directory: rm returned EISDIR (is a directory) /usr/bin'),
      );
    });

    it('throws by when force flag is set', () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      expect(() => vol.rmSync('/usr/bin', { force: true })).toThrowError(
        new Error('[ERR_FS_EISDIR]: Path is a directory: rm returned EISDIR (is a directory) /usr/bin'),
      );
    });

    it('deletes all directory contents when recursive flag is set', () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      vol.rmSync('/usr/bin', { recursive: true });

      expect(vol.toJSON()).toEqual({ '/usr': null });
    });

    it('deletes all directory contents recursively when recursive flag is set', () => {
      const vol = create({
        '/a/a/a': '1',
        '/a/a/b': '2',
        '/a/a/c': '3',
        '/a/b/a': '4',
        '/a/b/b': '5',
        '/a/c/a': '6',
      });

      vol.rmSync('/a/a', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a/b/a': '4',
        '/a/b/b': '5',
        '/a/c/a': '6',
      });

      vol.rmSync('/a/c', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a/b/a': '4',
        '/a/b/b': '5',
      });

      vol.rmSync('/a/b', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a': null,
      });

      vol.rmSync('/a', { recursive: true });

      expect(vol.toJSON()).toEqual({});
    });
  });
});
