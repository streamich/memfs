import { create } from '../util';
import type Stats from '../../Stats';

describe('mkdirSync', () => {
  it('can create a directory', () => {
    const vol = create();

    vol.mkdirSync('/new-dir');
    const stat = vol.statSync('/new-dir');

    expect(stat.isDirectory()).toBe(true);
  });

  it('root directory is directory', () => {
    const vol = create();
    const stat = vol.statSync('/');

    expect(stat.isDirectory()).toBe(true);
  });

  it('throws when re-creating existing directory', () => {
    const vol = create();

    vol.mkdirSync('/new-dir');

    let error;
    try {
      vol.mkdirSync('/new-dir');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  /**
   * See issue #325
   * https://github.com/streamich/memfs/issues/325
   */
  it('throws when creating root directory', () => {
    const vol = create();

    let error;
    try {
      vol.mkdirSync('/');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  /**
   * See issue #938
   * https://github.com/streamich/memfs/issues/938
   */
  it('can create a directory with name "__proto__"', () => {
    const vol = create();

    vol.mkdirSync('/__proto__');

    expect(vol.statSync('/__proto__').isDirectory()).toBe(true);
  });

  it('throws EACCES with insufficient permissions on containing directory', () => {
    const perms = [
      0o666, // rw across the board
      0o555, // rx across the bord
    ];
    perms.forEach(perm => {
      const vol = create({});
      vol.mkdirSync('/foo');
      vol.chmodSync('/foo', perm);
      expect(() => {
        vol.mkdirSync(`/foo/bar`);
      }).toThrowError(/EACCES/);
    });
  });

  describe('recursive', () => {
    it('can create nested directories when none exist', () => {
      const vol = create({});
      vol.mkdirSync('/a/b/c', { recursive: true });
      expect(() => {
        vol.statSync('/a/b/c');
      }).not.toThrow();
    });

    it('can create nested directories when some exist', () => {
      const vol = create({});
      vol.mkdirSync('/a');
      vol.mkdirSync('/a/b/c', { recursive: true });
      expect(() => {
        vol.statSync('/a/b/c');
      }).not.toThrow();
    });

    it('can create nested directories when all exist', () => {
      const vol = create({});
      vol.mkdirSync('/a');
      vol.mkdirSync('/a/b');
      vol.mkdirSync('/a/b/c');
      vol.mkdirSync('/a/b/c', { recursive: true });
      expect(() => {
        vol.statSync('/a/b/c');
      }).not.toThrow();
    });

    it('can create directories under symlinks', () => {
      const vol = create({});
      vol.mkdirSync('/target');
      vol.symlinkSync('/target', '/a');
      vol.mkdirSync('/a/b/c', { recursive: true });
      expect(() => {
        vol.statSync('/a/b/c');
      }).not.toThrow();
    });

    it('throws ENOTDIR when trying to create under something that is not a directory', () => {
      const vol = create({ '/a': 'I am a file' });
      expect(() => {
        vol.mkdirSync('/a/b/c', { recursive: true });
      }).toThrow(/ENOTDIR/);
    });

    it('throws EACCES with insufficient permissions on containing directory', () => {
      const perms = [
        0o666, // rw
        0o555, // rx
        0o111, // x
        0o222, // w
      ];
      perms.forEach(perm => {
        const vol = create({});
        vol.mkdirSync('/a', { mode: perm });
        expect(() => {
          vol.mkdirSync('/a/b/c', { recursive: true });
        }).toThrow(/EACCES/);
      });
    });

    it('throws EACCES with insufficient permissions on intermediate directory', () => {
      const vol = create({});
      vol.mkdirSync('/a');
      vol.chmodSync('/', 0o666); // rw
      expect(() => {
        vol.mkdirSync('/a/b/c', { recursive: true });
      }).toThrow(/EACCES/);
    });
  });
});
