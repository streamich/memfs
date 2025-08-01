import { Volume } from '../volume';

describe('Directory timestamp behavior', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('mtime (modification time)', () => {
    it('should update directory mtime when creating a file', done => {
      vol.fromJSON({ '/test/existing.txt': 'content' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.writeFileSync('/test/newfile.txt', 'new content');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
        done();
      }, 10);
    });

    it('should update directory mtime when creating a subdirectory', done => {
      vol.fromJSON({ '/test/existing.txt': 'content' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.mkdirSync('/test/subdir');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
        done();
      }, 10);
    });

    it('should update directory mtime when removing a file', done => {
      vol.fromJSON({ '/test/file.txt': 'content' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.unlinkSync('/test/file.txt');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
        done();
      }, 10);
    });

    it('should update directory mtime when renaming a file into the directory', done => {
      vol.fromJSON({ '/test/existing.txt': 'content', '/source.txt': 'source' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.renameSync('/source.txt', '/test/moved.txt');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBeGreaterThan(beforeMtime.getTime());
        done();
      }, 10);
    });

    it('should NOT update directory mtime when reading directory contents', done => {
      vol.fromJSON({ '/test/file.txt': 'content' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.readdirSync('/test');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBe(beforeMtime.getTime());
        done();
      }, 10);
    });

    it('should NOT update directory mtime when accessing a file in the directory', done => {
      vol.fromJSON({ '/test/file.txt': 'content' });
      const beforeMtime = vol.statSync('/test').mtime;

      setTimeout(() => {
        vol.statSync('/test/file.txt');
        const afterMtime = vol.statSync('/test').mtime;
        expect(afterMtime.getTime()).toBe(beforeMtime.getTime());
        done();
      }, 10);
    });
  });

  describe('atime (access time)', () => {
    it('should update directory atime when reading directory contents', done => {
      vol.fromJSON({ '/test/file.txt': 'content' });
      const beforeAtime = vol.statSync('/test').atime;

      setTimeout(() => {
        vol.readdirSync('/test');
        const afterAtime = vol.statSync('/test').atime;
        expect(afterAtime.getTime()).toBeGreaterThan(beforeAtime.getTime());
        done();
      }, 10);
    });

    it('should update directory atime when accessing a file in the directory', done => {
      vol.fromJSON({ '/test/file.txt': 'content' });
      const beforeAtime = vol.statSync('/test').atime;

      setTimeout(() => {
        vol.statSync('/test/file.txt');
        const afterAtime = vol.statSync('/test').atime;
        expect(afterAtime.getTime()).toBeGreaterThan(beforeAtime.getTime());
        done();
      }, 10);
    });
  });
});
