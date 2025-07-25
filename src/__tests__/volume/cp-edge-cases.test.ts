import { create } from '../util';

describe('cp edge cases', () => {
  describe('symlink handling', () => {
    it('copies symlinks by default', () => {
      const vol = create({
        '/original.txt': 'original content',
      });

      vol.symlinkSync('/original.txt', '/link.txt');
      vol.cpSync('/link.txt', '/copy.txt');

      const copyStats = vol.lstatSync('/copy.txt');
      expect(copyStats.isSymbolicLink()).toBe(true);
      expect(vol.readFileSync('/copy.txt', 'utf8')).toBe('original content');
    });

    it('dereferences symlinks when dereference option is true', () => {
      const vol = create({
        '/original.txt': 'original content',
      });

      vol.symlinkSync('/original.txt', '/link.txt');
      vol.cpSync('/link.txt', '/copy.txt', { dereference: true });

      const copyStats = vol.lstatSync('/copy.txt');
      expect(copyStats.isSymbolicLink()).toBe(false);
      expect(copyStats.isFile()).toBe(true);
      expect(vol.readFileSync('/copy.txt', 'utf8')).toBe('original content');
    });

    it('handles verbatimSymlinks option', () => {
      const vol = create({
        '/dir/original.txt': 'original content',
      });

      vol.symlinkSync('../dir/original.txt', '/dir/link.txt');
      vol.cpSync('/dir/link.txt', '/copy.txt', { verbatimSymlinks: true });

      const copyStats = vol.lstatSync('/copy.txt');
      expect(copyStats.isSymbolicLink()).toBe(true);
    });

    it('resolves relative symlinks when verbatimSymlinks is false', () => {
      const vol = create({
        '/dir/original.txt': 'original content',
      });

      vol.symlinkSync('./original.txt', '/dir/link.txt');
      vol.cpSync('/dir/link.txt', '/copy.txt', { verbatimSymlinks: false });

      const copyStats = vol.lstatSync('/copy.txt');
      expect(copyStats.isSymbolicLink()).toBe(true);
    });
  });

  describe('path validation', () => {
    it('throws error when src does not exist', () => {
      const vol = create({});

      expect(() => {
        vol.cpSync('/nonexistent', '/dest');
      }).toThrow(/ENOENT/);
    });

    it('throws error when trying to copy directory to existing file', () => {
      const vol = create({
        '/src/file.txt': 'content',
        '/dest.txt': 'existing file',
      });

      expect(() => {
        vol.cpSync('/src', '/dest.txt', { recursive: true });
      }).toThrow(/EISDIR/);
    });

    it('throws error when trying to copy file to existing directory', () => {
      const vol = create({
        '/src.txt': 'content',
        '/dest/file.txt': 'existing',
      });

      expect(() => {
        vol.cpSync('/src.txt', '/dest');
      }).toThrow(/ENOTDIR/);
    });

    it('prevents copying directory to its own subdirectory', () => {
      const vol = create({
        '/parent/child/file.txt': 'content',
      });

      expect(() => {
        vol.cpSync('/parent', '/parent/child/subdir', { recursive: true });
      }).toThrow(/EINVAL/);
    });
  });

  describe('file modes and permissions', () => {
    it('preserves file mode', () => {
      const vol = create({
        '/src.txt': 'content',
      });

      vol.chmodSync('/src.txt', 0o644);
      vol.cpSync('/src.txt', '/dest.txt');

      const srcStats = vol.statSync('/src.txt');
      const destStats = vol.statSync('/dest.txt');
      expect(destStats.mode & 0o777).toBe(srcStats.mode & 0o777);
    });

    it('preserves directory mode', () => {
      const vol = create({
        '/src/file.txt': 'content',
      });

      vol.chmodSync('/src', 0o755);
      vol.cpSync('/src', '/dest', { recursive: true });

      const srcStats = vol.statSync('/src');
      const destStats = vol.statSync('/dest');
      expect(destStats.mode & 0o777).toBe(srcStats.mode & 0o777);
    });
  });

  describe('empty directories', () => {
    it('copies empty directories', () => {
      const vol = create({});
      vol.mkdirSync('/empty');

      vol.cpSync('/empty', '/dest', { recursive: true });

      expect(vol.statSync('/dest').isDirectory()).toBe(true);
      expect(vol.readdirSync('/dest')).toEqual([]);
    });
  });

  describe('nested structures', () => {
    it('copies deeply nested directory structures', () => {
      const vol = create({
        '/src/a/b/c/d/file.txt': 'deep content',
        '/src/a/b/other.txt': 'other content',
        '/src/a/sibling.txt': 'sibling content',
      });

      vol.cpSync('/src', '/dest', { recursive: true });

      expect(vol.readFileSync('/dest/a/b/c/d/file.txt', 'utf8')).toBe('deep content');
      expect(vol.readFileSync('/dest/a/b/other.txt', 'utf8')).toBe('other content');
      expect(vol.readFileSync('/dest/a/sibling.txt', 'utf8')).toBe('sibling content');
    });
  });

  describe('special file types', () => {
    it('handles regular files', () => {
      const vol = create({
        '/regular.txt': 'content',
      });

      vol.cpSync('/regular.txt', '/copy.txt');
      expect(vol.readFileSync('/copy.txt', 'utf8')).toBe('content');
    });
  });

  describe('multiple file types in directory', () => {
    it('copies mixed file types in directories', () => {
      const vol = create({
        '/src/regular.txt': 'regular file',
        '/src/subdir/nested.txt': 'nested file',
      });

      vol.symlinkSync('/src/regular.txt', '/src/link.txt');
      vol.cpSync('/src', '/dest', { recursive: true });

      expect(vol.readFileSync('/dest/regular.txt', 'utf8')).toBe('regular file');
      expect(vol.readFileSync('/dest/subdir/nested.txt', 'utf8')).toBe('nested file');
      expect(vol.lstatSync('/dest/link.txt').isSymbolicLink()).toBe(true);
    });
  });
});
