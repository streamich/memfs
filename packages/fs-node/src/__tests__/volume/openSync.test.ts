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

  describe('trailing slash', () => {
    const setup = () => {
      const fs = createFs({ '/file': 'content', '/dir/file': 'content' });
      fs.symlinkSync('/file', '/filelink');
      fs.symlinkSync('/dir', '/dirlink');
      fs.symlinkSync('/missing', '/dangling');
      return fs;
    };

    it('follows a symlink to a directory even with O_NOFOLLOW', () => {
      const fs = setup();
      const fd = fs.openSync('/dirlink/', O_RDONLY | O_NOFOLLOW);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
    });

    it('follows a symlink to a directory with O_NOFOLLOW | O_DIRECTORY', () => {
      const fs = setup();
      const fd = fs.openSync('/dirlink/', O_RDONLY | O_NOFOLLOW | O_DIRECTORY);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
    });

    it('opens a directory', () => {
      const fs = setup();
      const fd = fs.openSync('/dir/', O_RDONLY);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
    });

    it('throws ENOTDIR when a symlink resolves to a file, with or without O_NOFOLLOW', () => {
      const fs = setup();
      expect(() => fs.openSync('/filelink/', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
      expect(() => fs.openSync('/filelink/', O_RDONLY | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'ENOTDIR' }),
      );
    });

    it('throws ENOTDIR for a regular file and reports the path as given', () => {
      const fs = setup();
      expect(() => fs.openSync('/file/', O_RDONLY)).toThrow("ENOTDIR: not a directory, open '/file/'");
      expect(() => fs.openSync('/file/', O_RDONLY)).toThrow(
        expect.objectContaining({ code: 'ENOTDIR', path: '/file/' }),
      );
    });

    it('throws ENOENT for a dangling symlink, with or without O_NOFOLLOW', () => {
      const fs = setup();
      expect(() => fs.openSync('/dangling/', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ENOENT' }));
      expect(() => fs.openSync('/dangling/', O_RDONLY | O_NOFOLLOW)).toThrow(
        expect.objectContaining({ code: 'ENOENT' }),
      );
    });

    it('throws EISDIR with O_CREAT on a directory, even read-only', () => {
      const fs = setup();
      expect(() => fs.openSync('/dir/', O_RDONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(() => fs.openSync('/dir/', 'w')).toThrow(expect.objectContaining({ code: 'EISDIR' }));
    });

    it('throws EISDIR with O_CREAT on a missing path and creates nothing', () => {
      const fs = setup();
      expect(() => fs.openSync('/nonexist/', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(() => fs.openSync('/nonexist/', 'w')).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(fs.existsSync('/nonexist')).toBe(false);
    });

    it('throws EISDIR with O_CREAT on a regular file and leaves it intact', () => {
      const fs = setup();
      expect(() => fs.openSync('/file/', O_WRONLY | O_CREAT | O_TRUNC)).toThrow(
        expect.objectContaining({ code: 'EISDIR' }),
      );
      expect(fs.readFileSync('/file', 'utf8')).toBe('content');
    });

    it('throws EISDIR with O_CREAT on a dangling symlink and leaves it alone', () => {
      const fs = setup();
      expect(() => fs.openSync('/dangling/', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(fs.lstatSync('/dangling').isSymbolicLink()).toBe(true);
      expect(fs.existsSync('/missing')).toBe(false);
    });

    it('does not treat the root path as a trailing slash', () => {
      const fs = setup();
      const fd = fs.openSync('/', O_RDONLY);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
    });

    it('applies to the body of a symlink', () => {
      const fs = setup();
      fs.symlinkSync('/file/', '/bodyfile');
      fs.symlinkSync('/newfile/', '/bodynew');
      fs.symlinkSync('/dir/', '/bodydir');
      expect(() => fs.openSync('/bodyfile', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
      expect(() => fs.openSync('/bodynew', 'w')).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(fs.existsSync('/newfile')).toBe(false);
      const fd = fs.openSync('/bodydir', O_RDONLY);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
      expect(() => fs.openSync('/bodydir', O_RDONLY | O_NOFOLLOW)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
    });

    it('reports the path as given when the resolved directory is rejected', () => {
      const fs = setup();
      expect(() => fs.openSync('/dirlink/', O_WRONLY)).toThrow(
        expect.objectContaining({ code: 'EISDIR', path: '/dirlink/' }),
      );
      expect(() => fs.openSync('/', O_WRONLY)).toThrow(expect.objectContaining({ code: 'EISDIR', path: '/' }));
      expect(() => fs.openSync('/filelink', O_RDONLY | O_DIRECTORY)).toThrow(
        expect.objectContaining({ code: 'ENOTDIR', path: '/filelink' }),
      );
    });

    it('counts a trailing backslash on win32', () => {
      const fs = setup();
      const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      try {
        expect(() => fs.openSync('/nonexist\\', 'w')).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      } finally {
        Object.defineProperty(process, 'platform', platform);
      }
      expect(fs.existsSync('/nonexist\\')).toBe(false);
    });

    it('looks the parent up before EISDIR under O_CREAT', () => {
      const fs = setup();
      fs.mkdirSync('/noexec', { mode: 0o666 });
      fs.mkdirSync('/nowrite', { mode: 0o555 });
      fs.symlinkSync('/loopb', '/loopa');
      fs.symlinkSync('/loopa', '/loopb');
      const creat = (path: string) => () => fs.openSync(path, O_WRONLY | O_CREAT);
      expect(creat('/nope/x/')).toThrow(expect.objectContaining({ code: 'ENOENT', path: '/nope/x/' }));
      expect(creat('/file/x/')).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
      expect(creat('/dangling/x/')).toThrow(expect.objectContaining({ code: 'ENOENT' }));
      expect(creat('/loopa/x/')).toThrow(expect.objectContaining({ code: 'ELOOP' }));
      expect(creat('/noexec/x/')).toThrow(expect.objectContaining({ code: 'EACCES' }));
      expect(creat('/nowrite/x/')).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(fs.existsSync('/nope')).toBe(false);
    });

    it('looks the parent up before EISDIR under O_CREAT for a symlink body', () => {
      const fs = setup();
      fs.symlinkSync('/nope/x/', '/bodynope');
      fs.symlinkSync('/file/x/', '/bodyfile');
      expect(() => fs.openSync('/bodynope', 'w')).toThrow(
        expect.objectContaining({ code: 'ENOENT', path: '/bodynope' }),
      );
      expect(() => fs.openSync('/bodyfile', 'w')).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
    });

    it('treats a trailing "/." like a trailing slash', () => {
      const fs = setup();
      const fd = fs.openSync('/dirlink/.', O_RDONLY | O_NOFOLLOW);
      expect(fs.fstatSync(fd).isDirectory()).toBe(true);
      fs.closeSync(fd);
      expect(() => fs.openSync('/file/.', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
      expect(() => fs.openSync('/filelink/.', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ENOTDIR' }));
      expect(() => fs.openSync('/dangling/.', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'ENOENT' }));
      expect(fs.existsSync('/missing')).toBe(false);
      expect(() => fs.openSync('/dir/.', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
      expect(() => fs.openSync('/nope/.', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'ENOENT' }));
    });
  });

  describe('O_CREAT through a symlink', () => {
    const setup = () => {
      const fs = createFs({ '/dir/file': 'content' });
      fs.symlinkSync('/target', '/dangling');
      fs.symlinkSync('/dangling', '/chain');
      fs.symlinkSync('/dir/created', '/intodir');
      fs.symlinkSync('/missingdir/target', '/danglingdir');
      fs.symlinkSync('/loopb', '/loopa');
      fs.symlinkSync('/loopa', '/loopb');
      return fs;
    };

    it('creates the target of a dangling symlink and leaves the symlink in place', () => {
      const fs = setup();
      const fd = fs.openSync('/dangling', O_WRONLY | O_CREAT);
      fs.writeSync(fd, 'hi');
      fs.closeSync(fd);
      expect(fs.lstatSync('/dangling').isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync('/dangling')).toBe('/target');
      expect(fs.readFileSync('/target', 'utf8')).toBe('hi');
    });

    it('creates the target at the end of a symlink chain', () => {
      const fs = setup();
      fs.closeSync(fs.openSync('/chain', O_WRONLY | O_CREAT));
      expect(fs.lstatSync('/chain').isSymbolicLink()).toBe(true);
      expect(fs.lstatSync('/dangling').isSymbolicLink()).toBe(true);
      expect(fs.statSync('/target').isFile()).toBe(true);
    });

    it('creates the target inside the directory the symlink points into', () => {
      const fs = setup();
      fs.closeSync(fs.openSync('/intodir', O_WRONLY | O_CREAT));
      expect(fs.statSync('/dir/created').isFile()).toBe(true);
      expect(fs.existsSync('/created')).toBe(false);
      expect(fs.lstatSync('/intodir').isSymbolicLink()).toBe(true);
    });

    it('throws ENOENT when the target directory is missing and leaves the symlink alone', () => {
      const fs = setup();
      expect(() => fs.openSync('/danglingdir', O_WRONLY | O_CREAT)).toThrow(
        expect.objectContaining({ code: 'ENOENT', path: '/danglingdir' }),
      );
      expect(fs.lstatSync('/danglingdir').isSymbolicLink()).toBe(true);
    });

    it('throws EEXIST with O_CREAT | O_EXCL on a dangling symlink and creates nothing', () => {
      const fs = setup();
      expect(() => fs.openSync('/dangling', O_WRONLY | O_CREAT | O_EXCL)).toThrow(
        expect.objectContaining({ code: 'EEXIST' }),
      );
      expect(fs.lstatSync('/dangling').isSymbolicLink()).toBe(true);
      expect(fs.existsSync('/target')).toBe(false);
    });

    it('throws ELOOP on a symlink loop and creates nothing', () => {
      const fs = setup();
      expect(() => fs.openSync('/loopa', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ELOOP', path: '/loopa' }));
      expect(() => fs.openSync('/loopa', O_WRONLY | O_CREAT)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
      expect(fs.lstatSync('/loopa').isSymbolicLink()).toBe(true);
      expect(fs.lstatSync('/loopb').isSymbolicLink()).toBe(true);
    });

    it('follows a chain of 40 symlinks and rejects 41', () => {
      const fs = createFs({ '/file': 'content' });
      let prev = '/file';
      for (let i = 1; i <= 41; i++) {
        const link = '/l' + i;
        fs.symlinkSync(prev, link);
        prev = link;
      }
      fs.closeSync(fs.openSync('/l40', O_RDONLY));
      expect(() => fs.openSync('/l41', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
    });

    it('shares the hop budget between intermediate and final symlinks', () => {
      const fs = createFs({ '/dir/file': 'content' });
      fs.symlinkSync('/dir', '/d');
      let prev = '/dir/file';
      for (let i = 1; i <= 40; i++) {
        const link = '/dir/l' + i;
        fs.symlinkSync(prev, link);
        prev = link;
      }
      fs.closeSync(fs.openSync('/dir/l40', O_RDONLY));
      expect(() => fs.openSync('/d/l40', O_RDONLY)).toThrow(expect.objectContaining({ code: 'ELOOP' }));
      expect(() => fs.statSync('/d/l40')).toThrow(expect.objectContaining({ code: 'ELOOP' }));
    });

    it('throws EISDIR with O_CREAT on an existing directory, even read-only', () => {
      const fs = setup();
      expect(() => fs.openSync('/dir', O_RDONLY | O_CREAT)).toThrow(
        expect.objectContaining({ code: 'EISDIR', path: '/dir' }),
      );
    });

    it('resolves a relative symlink target against the symlink parent', () => {
      const fs = createFs({ '/dir/sub/file': 'content' });
      fs.symlinkSync('target', '/dir/dangling');
      fs.symlinkSync('../up', '/dir/sub/link');
      fs.symlinkSync('t', '/rel');
      fs.closeSync(fs.openSync('/dir/dangling', O_WRONLY | O_CREAT));
      fs.closeSync(fs.openSync('/dir/sub/link', O_WRONLY | O_CREAT));
      fs.closeSync(fs.openSync('/rel', O_WRONLY | O_CREAT));
      expect(fs.statSync('/dir/target').isFile()).toBe(true);
      expect(fs.statSync('/dir/up').isFile()).toBe(true);
      expect(fs.statSync('/t').isFile()).toBe(true);
    });

    it('throws EACCES when the target directory is not writable and creates nothing', () => {
      const fs = createFs({ '/ro/file': 'content' });
      fs.symlinkSync('/ro/new', '/link');
      fs.chmodSync('/ro', 0o555);
      expect(() => fs.openSync('/link', O_WRONLY | O_CREAT)).toThrow(
        expect.objectContaining({ code: 'EACCES', path: '/link' }),
      );
      expect(fs.existsSync('/ro/new')).toBe(false);
      expect(fs.lstatSync('/link').isSymbolicLink()).toBe(true);
    });

    it('throws EMFILE before creating anything', () => {
      const fs = createFs({});
      fs._core.maxFiles = 0;
      expect(() => fs.openSync('/new', 'w')).toThrow(expect.objectContaining({ code: 'EMFILE', path: '/new' }));
      expect(fs.existsSync('/new')).toBe(false);
    });

    it('creates through more than 20 intermediate symlink hops', () => {
      const fs = createFs({ '/dir/file': 'content' });
      let prev = '/dir';
      for (let i = 1; i <= 21; i++) {
        const link = '/s' + i;
        fs.symlinkSync(prev, link);
        prev = link;
      }
      fs.closeSync(fs.openSync('/s21/newfile', O_WRONLY | O_CREAT));
      expect(fs.statSync('/dir/newfile').isFile()).toBe(true);
      fs.symlinkSync('/s20/newfile2', '/dl');
      fs.closeSync(fs.openSync('/dl', O_WRONLY | O_CREAT));
      expect(fs.statSync('/dir/newfile2').isFile()).toBe(true);
    });

    it('throws EINVAL for O_CREAT | O_DIRECTORY and creates nothing', () => {
      const fs = setup();
      expect(() => fs.openSync('/dir', O_RDONLY | O_CREAT | O_DIRECTORY)).toThrow(
        expect.objectContaining({ code: 'EINVAL' }),
      );
      expect(() => fs.openSync('/nonexist', O_RDONLY | O_CREAT | O_DIRECTORY)).toThrow(
        expect.objectContaining({ code: 'EINVAL', path: '/nonexist' }),
      );
      expect(fs.existsSync('/nonexist')).toBe(false);
    });
  });
});
