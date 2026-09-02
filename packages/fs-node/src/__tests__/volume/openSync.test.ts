import { createFs } from '../util';
import { normalize, dirname } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { constants } from '@jsonjoy.com/fs-node-utils';

const { O_RDONLY, O_WRONLY, O_CREAT, O_EXCL, O_TRUNC, O_DIRECTORY, O_NOFOLLOW, O_SYMLINK } = constants;

describe('openSync(path, mode[, flags])', () => {
  it('should return a file descriptor', () => {
    const fs = createFs();
    const fd = fs.openSync('/foo', 'w');
    expect(typeof fd).toEqual('number');
  });

  it('throws ENOTDIR when trying to create a non-existent file inside another file', () => {
    const fs = createFs();

    expect(() => {
      fs.openSync('/foo/baz', 'a');
    }).toThrow(/ENOTDIR/);
  });

  describe('permissions', () => {
    it('opening for writing throws EACCES without sufficient permissions on the file', () => {
      const flags = ['a', 'w', 'r+']; // append, write, read+write
      flags.forEach(intent => {
        const fs = createFs();
        fs.chmodSync('/foo', 0o555); // rx across the board
        expect(() => {
          fs.openSync('/foo', intent);
        }).toThrowError(/EACCES/);
      });
    });

    it('opening for reading throws EACCES without sufficient permissions on the file', () => {
      const flags = ['a+', 'r', 'w+']; // append+read, read, write+read
      flags.forEach(intent => {
        const fs = createFs();
        fs.chmodSync('/foo', 0o333); // wx across the board
        expect(() => {
          fs.openSync('/foo', intent);
        }).toThrowError(/EACCES/);
      });
    });

    it('opening for anything throws EACCES without sufficient permissions on the containing directory of an existing file', () => {
      const flags = ['a+', 'r', 'w']; // append+read, read, write
      flags.forEach(intent => {
        const fs = createFs({ '/foo/bar': 'test' });
        fs.chmodSync('/foo', 0o666); // wr across the board
        expect(() => {
          fs.openSync('/foo/bar', intent);
        }).toThrowError(/EACCES/);
      });
    });

    it('opening for anything throws EACCES without sufficient permissions on an intermediate directory', () => {
      const flags = ['a+', 'r', 'w']; // append+read, read, write
      flags.forEach(intent => {
        const fs = createFs({ '/foo/bar': 'test' });
        fs.chmodSync('/', 0o666); // wr across the board
        expect(() => {
          fs.openSync('/foo/bar', intent);
        }).toThrowError(/EACCES/);
      });
    });

    it('opening for anything throws EACCES without sufficient permissions on the containing directory of an non-existent file', () => {
      const flags = ['a+', 'r', 'w']; // append+read, read, write
      flags.forEach(intent => {
        const fs = createFs({});
        fs.mkdirSync('/foo', { mode: 0o666 }); // wr
        expect(() => {
          fs.openSync('/foo/bar', intent);
        }).toThrowError(/EACCES/);
      });
    });

    it('should open file when using native file seperators', () => {
      const fs = createFs({});
      // Normalize the path to match the current operating system's format.
      // This is crucial for catching path-related issues that arise when using native paths on Windows.
      const filePath = normalize('/foo/bar.txt');

      fs.mkdirSync(dirname(filePath));
      fs.writeFileSync(filePath, 'test');

      expect(() => fs.openSync(filePath, 'r')).not.toThrow();
    });
  });

  describe('O_NOFOLLOW', () => {
    const setup = () => {
      const fs = createFs({ '/file': 'content', '/dir/file': 'content' });
      fs.symlinkSync('/file', '/link');
      fs.symlinkSync('/dir', '/dirlink');
      fs.symlinkSync('/missing', '/dangling');
      return fs;
    };

    it('O_NOFOLLOW throws ELOOP when the final path component is a symlink', () => {
      const fs = setup();
      expect(() => fs.openSync('/link', O_RDONLY | O_NOFOLLOW)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
    });

    it('O_NOFOLLOW formats the ELOOP error like Node', () => {
      const fs = setup();
      expect(() => fs.openSync('/link', O_RDONLY | O_NOFOLLOW)).toThrow(
        "ELOOP: too many symbolic links encountered, open '/link'",
      );
    });

    it('O_NOFOLLOW throws ELOOP when the final path component is a symlink to a directory', () => {
      const fs = setup();
      expect(() => fs.openSync('/dirlink', O_RDONLY | O_NOFOLLOW)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
    });

    it('O_NOFOLLOW opens a regular file', () => {
      const fs = setup();
      const fd = fs.openSync('/file', O_RDONLY | O_NOFOLLOW);
      expect(typeof fd).toBe('number');
      fs.closeSync(fd);
    });

    it('O_NOFOLLOW follows symlinks in intermediate path components', () => {
      const fs = setup();
      const fd = fs.openSync('/dirlink/file', O_RDONLY | O_NOFOLLOW);
      expect(typeof fd).toBe('number');
      fs.closeSync(fd);
    });

    it('O_NOFOLLOW throws ELOOP for a dangling symlink even with O_CREAT and leaves the symlink alone', () => {
      const fs = setup();
      expect(() => fs.openSync('/dangling', O_WRONLY | O_CREAT | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'ELOOP' }),
      );
      expect(fs.existsSync('/missing')).toBe(false);
      expect(fs.lstatSync('/dangling').isSymbolicLink()).toBe(true);
    });

    it('O_NOFOLLOW throws ELOOP before O_TRUNC touches the symlink target', () => {
      const fs = setup();
      expect(() => fs.openSync('/link', O_WRONLY | O_TRUNC | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'ELOOP' }),
      );
      expect(fs.readFileSync('/file', 'utf8')).toBe('content');
    });

    it('O_NOFOLLOW with O_CREAT | O_EXCL throws EEXIST when the symlink exists', () => {
      const fs = setup();
      expect(() => fs.openSync('/link', O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'EEXIST' }),
      );
    });

    it('O_NOFOLLOW with O_DIRECTORY throws ENOTDIR when the final path component is a symlink to a directory', () => {
      const fs = setup();
      expect(() => fs.openSync('/dirlink', O_RDONLY | O_DIRECTORY | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'ENOTDIR' }),
      );
    });

    it('O_NOFOLLOW with O_SYMLINK throws ELOOP', () => {
      const fs = setup();
      expect(() => fs.openSync('/link', O_RDONLY | O_NOFOLLOW | O_SYMLINK)).toThrow(
        expect.objectContaining({ code: 'ELOOP' }),
      );
    });
  });
});
