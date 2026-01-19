import { createFs } from '../../__tests__/util';

describe('Directory timestamp behavior', () => {
  let fs: any;

  beforeEach(() => {
    fs = createFs();
  });

  describe('mtime (modification time)', () => {
    it('should update directory mtime when creating a file', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/existing.txt', 'content');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.writeFile('/test/newfile.txt', 'new content');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
    });

    it('should update directory mtime when creating a subdirectory', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/existing.txt', 'content');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.mkdir('/test/subdir');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
    });

    it('should update directory mtime when removing a file', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/file.txt', 'content');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.unlink('/test/file.txt');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
    });

    it('should update directory mtime when renaming a file into the directory', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/existing.txt', 'content');
      await fs.promises.writeFile('/source.txt', 'source');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.rename('/source.txt', '/test/moved.txt');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
    });

    it('should NOT update directory mtime when reading directory contents', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/file.txt', 'content');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      await fs.promises.readdir('/test');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBe(beforeMtime.getTime());
    });

    it('should NOT update directory mtime when accessing a file in the directory', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/file.txt', 'content');
      const beforeMtime = (await fs.promises.stat('/test')).mtime;

      await fs.promises.stat('/test/file.txt');
      const afterMtime = (await fs.promises.stat('/test')).mtime;
      expect(afterMtime.getTime()).toBe(beforeMtime.getTime());
    });
  });

  describe('atime (access time)', () => {
    it('should update directory atime when reading directory contents', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/file.txt', 'content');
      const beforeAtime = (await fs.promises.stat('/test')).atime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.readdir('/test');
      const afterAtime = (await fs.promises.stat('/test')).atime;
      expect(afterAtime.getTime()).toBeGreaterThan(beforeAtime.getTime());
    });

    it('should update directory atime when accessing a file in the directory', async () => {
      await fs.promises.mkdir('/test');
      await fs.promises.writeFile('/test/file.txt', 'content');
      const beforeAtime = (await fs.promises.stat('/test')).atime;

      // Minimal delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await fs.promises.stat('/test/file.txt');
      const afterAtime = (await fs.promises.stat('/test')).atime;
      expect(afterAtime.getTime()).toBeGreaterThan(beforeAtime.getTime());
    });
  });
});
