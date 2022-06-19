import { create } from '../util';

describe('rmSync', () => {
  it('remove directory with two files', async () => {
    const vol = create({
      '/foo/bar': 'baz',
      '/foo/baz': 'qux',
      '/oof': 'zab',
    });

    await vol.promises.rm('/foo', { force: true, recursive: true });

    expect(vol.toJSON()).toEqual({
      '/oof': 'zab',
    });
  });

  it('removes a single file', async () => {
    const vol = create({
      '/a/b/c.txt': 'content',
    });

    await vol.promises.rm('/a/b/c.txt');

    expect(vol.toJSON()).toEqual({
      '/a/b': null,
    });
  });

  describe('when file does not exist', () => {
    it('throws by default', async () => {
      const vol = create({
        '/foo.txt': 'content',
      });

      let error;
      try {
        await vol.promises.rm('/bar.txt');
        throw new Error('Not this');
      } catch (err) {
        error = err;
      }

      expect(error).toEqual(new Error("ENOENT: no such file or directory, stat '/bar.txt'"));
    });

    it('does not throw if "force" is set to true', async () => {
      const vol = create({
        '/foo.txt': 'content',
      });

      await vol.promises.rm('/bar.txt', { force: true });
    });
  });

  describe('when deleting a directory', () => {
    it('throws by default', async () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      let error;
      try {
        await vol.promises.rm('/usr/bin');
        throw new Error('Not this');
      } catch (err) {
        error = err;
      }

      expect(error).toEqual(
        new Error('[ERR_FS_EISDIR]: Path is a directory: rm returned EISDIR (is a directory) /usr/bin'),
      );
    });

    it('throws by when force flag is set', async () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      let error;
      try {
        await vol.promises.rm('/usr/bin', { force: true });
        throw new Error('Not this');
      } catch (err) {
        error = err;
      }

      expect(error).toEqual(
        new Error('[ERR_FS_EISDIR]: Path is a directory: rm returned EISDIR (is a directory) /usr/bin'),
      );
    });

    it('deletes all directory contents when recursive flag is set', async () => {
      const vol = create({
        '/usr/bin/bash': '...',
      });

      await vol.promises.rm('/usr/bin', { recursive: true });

      expect(vol.toJSON()).toEqual({ '/usr': null });
    });

    it('deletes all directory contents recursively when recursive flag is set', async () => {
      const vol = create({
        '/a/a/a': '1',
        '/a/a/b': '2',
        '/a/a/c': '3',
        '/a/b/a': '4',
        '/a/b/b': '5',
        '/a/c/a': '6',
      });

      await vol.promises.rm('/a/a', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a/b/a': '4',
        '/a/b/b': '5',
        '/a/c/a': '6',
      });

      await vol.promises.rm('/a/c', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a/b/a': '4',
        '/a/b/b': '5',
      });

      await vol.promises.rm('/a/b', { recursive: true });

      expect(vol.toJSON()).toEqual({
        '/a': null,
      });

      await vol.promises.rm('/a', { recursive: true });

      expect(vol.toJSON()).toEqual({});
    });
  });
});
