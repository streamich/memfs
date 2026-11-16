import { create } from '../util';

describe('removal inode lifecycle', () => {
  it('releases the inode after removing a file', () => {
    const vol = create({ '/file': 'content' });
    const ino = vol.statSync('/file').ino;
    vol.rmSync('/file');
    expect(vol._core.inodes[Number(ino)]).toBeUndefined();
    expect(vol._core.releasedInos).toContain(ino);
    expect(Object.keys(vol._core.inodes)).toHaveLength(1);
  });

  it.each(['rm', 'rmdir'])('releases every inode in a subtree removed with %s', method => {
    const vol = create({ '/tree/nested/file': 'content', '/tree/other': 'other' });
    const root = vol._core.root.getNode();
    if (method === 'rm') vol.rmSync('/tree', { recursive: true });
    else vol.rmdirSync('/tree', { recursive: true });
    expect(Object.values(vol._core.inodes)).toEqual([root]);
    expect(new Set(vol._core.releasedInos).size).toBe(4);
    expect(vol.readdirSync('/')).toEqual([]);
  });

  it('releases an empty directory inode', () => {
    const vol = create({});
    vol.mkdirSync('/empty');
    vol.rmdirSync('/empty');
    expect(Object.keys(vol._core.inodes)).toHaveLength(1);
  });

  it('keeps an external hard link and removes each internal hard link once', () => {
    const vol = create({ '/tree/file': 'content' });
    vol.linkSync('/tree/file', '/tree/alias');
    vol.linkSync('/tree/file', '/outside');
    const ino = Number(vol.statSync('/outside').ino);
    vol.rmSync('/tree', { recursive: true });
    expect(vol.readFileSync('/outside', 'utf8')).toBe('content');
    expect(vol.statSync('/outside').nlink).toBe(1);
    expect(vol._core.inodes[ino]).toBeDefined();
    vol.unlinkSync('/outside');
    expect(vol._core.inodes[ino]).toBeUndefined();
    expect(vol._core.releasedInos.filter(value => value === ino)).toHaveLength(1);
  });

  it('releases an inode shared by two links inside the removed subtree only once', () => {
    const vol = create({ '/tree/file': 'content' });
    vol.linkSync('/tree/file', '/tree/alias');
    const ino = Number(vol.statSync('/tree/file').ino);
    vol.rmSync('/tree', { recursive: true });
    expect(vol._core.inodes[ino]).toBeUndefined();
    expect(vol._core.releasedInos.filter(value => value === ino)).toHaveLength(1);
  });

  it.each([false, true])('preserves an open file after removal (recursive: %s)', recursive => {
    const vol = create({ '/tree/file': 'content' });
    const fd = vol.openSync('/tree/file', 'r');
    const ino = Number(vol.fstatSync(fd).ino);
    try {
      vol.rmSync(recursive ? '/tree' : '/tree/file', { recursive });
      expect(vol._core.inodes[ino]).toBeUndefined();
      expect(vol.fstatSync(fd).nlink).toBe(0);
      expect(vol.readFileSync(fd, 'utf8')).toBe('content');
      vol.writeFileSync('/replacement', 'different');
      expect(vol.fstatSync(fd).size).toBe(7);
    } finally {
      vol.closeSync(fd);
    }
    expect(Object.keys(vol._core.fds)).toHaveLength(0);
  });

  it('releases a symlink in a removed subtree without removing its target', () => {
    const vol = create({ '/outside': 'content' });
    vol.mkdirSync('/tree');
    vol.symlinkSync('/outside', '/tree/link');
    const ino = Number(vol.lstatSync('/tree/link').ino);
    vol.rmSync('/tree', { recursive: true });
    expect(vol._core.inodes[ino]).toBeUndefined();
    expect(vol.readFileSync('/outside', 'utf8')).toBe('content');
    expect(Object.keys(vol._core.inodes)).toHaveLength(2);
  });

  it('reuses inode numbers across repeated create/remove cycles', () => {
    const vol = create({});
    for (let round = 0; round < 5; round++) {
      vol.mkdirSync('/tree');
      for (let i = 0; i < 10; i++) vol.writeFileSync(`/tree/file${i}`, Buffer.alloc(1024));
      vol.rmSync('/tree', { recursive: true });
      expect(Object.keys(vol._core.inodes)).toHaveLength(1);
      expect(vol._core.releasedInos).toHaveLength(11);
      expect(Object.keys(vol._core.fds)).toHaveLength(0);
    }
  });
});
