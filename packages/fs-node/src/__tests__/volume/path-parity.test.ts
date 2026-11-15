import { create } from '../util';

describe('filesystem path parity', () => {
  describe('rename', () => {
    it.each(['/target', '/dir', '/missing'])('renames the symlink to %s without following it', target => {
      const vol = create({ '/target': 'data', '/dir/child': 'child' });
      vol.symlinkSync(target, '/link');
      const ino = vol.lstatSync('/link').ino;
      vol.renameSync('/link', '/renamed');
      expect(vol.lstatSync('/renamed').isSymbolicLink()).toBe(true);
      expect(vol.lstatSync('/renamed').ino).toBe(ino);
      expect(vol.readlinkSync('/renamed')).toBe(target);
      expect(() => vol.lstatSync('/link')).toThrow(/ENOENT/);
      expect(vol.readFileSync('/target', 'utf8')).toBe('data');
      expect(vol.readFileSync('/dir/child', 'utf8')).toBe('child');
    });

    it('follows intermediate symlinks while preserving the final symlink', () => {
      const vol = create({ '/real/deep/file': 'data', '/out/deep/existing': 'old' });
      vol.symlinkSync('/real', '/source');
      vol.symlinkSync('/out', '/destination');
      vol.symlinkSync('file', '/real/deep/link');
      vol.renameSync('/source/deep/link', '/destination/deep/renamed');
      expect(vol.readlinkSync('/out/deep/renamed')).toBe('file');
      expect(vol.readFileSync('/real/deep/file', 'utf8')).toBe('data');
      expect(() => vol.lstatSync('/real/deep/link')).toThrow(/ENOENT/);
    });

    it('replaces a destination symlink without changing its target', () => {
      const vol = create({ '/source': 'new', '/target': 'old' });
      vol.symlinkSync('/target', '/destination');
      vol.renameSync('/source', '/destination');
      expect(vol.lstatSync('/destination').isFile()).toBe(true);
      expect(vol.readFileSync('/destination', 'utf8')).toBe('new');
      expect(vol.readFileSync('/target', 'utf8')).toBe('old');
    });

    it.each(['/a/moved', '/a/b/moved', '/alias/b/moved'])(
      'rejects moving a directory into itself at %s before changing the tree',
      destination => {
        const vol = create({ '/a/b/file': 'data' });
        vol.symlinkSync('/a', '/alias');
        const before = vol.toJSON();
        expect(() => vol.renameSync('/a', destination)).toThrow(/EINVAL/);
        expect(vol.toJSON()).toEqual(before);
        expect(vol.readFileSync('/a/b/file', 'utf8')).toBe('data');
        expect(vol.readlinkSync('/alias')).toBe('/a');
      },
    );

    it('allows the same directory path and a sibling with a shared name prefix', () => {
      const vol = create({ '/a/file': 'data', '/ab/existing': 'old' });
      vol.renameSync('/a', '/a');
      vol.renameSync('/a', '/ab/a');
      expect(vol.readFileSync('/ab/a/file', 'utf8')).toBe('data');
      expect(vol.readFileSync('/ab/existing', 'utf8')).toBe('old');
    });

    it('reports a missing destination parent without removing the source', () => {
      const vol = create({ '/source': 'data' });
      expect(() => vol.renameSync('/source', '/missing/destination')).toThrow(/ENOENT/);
      expect(vol.readFileSync('/source', 'utf8')).toBe('data');
    });

    it.each([
      ['/file', '/dir', 'EISDIR'],
      ['/link', '/dir', 'EISDIR'],
      ['/dir', '/file', 'ENOTDIR'],
      ['/dir', '/link', 'ENOTDIR'],
      ['/dir', '/other', 'ENOTEMPTY'],
    ])('preserves both paths when renaming %s over %s fails', (source, destination, code) => {
      const vol = create({ '/file': 'data', '/dir/child': 'child', '/other/child': 'other' });
      vol.symlinkSync('/file', '/link');
      const before = vol.toJSON();
      expect(() => vol.renameSync(source, destination)).toThrow(new RegExp(code));
      expect(vol.toJSON()).toEqual(before);
      expect(vol.readlinkSync('/link')).toBe('/file');
    });

    it('keeps both hard links when source and destination share an inode', () => {
      const vol = create({ '/file': 'data' });
      vol.linkSync('/file', '/hard');
      vol.renameSync('/file', '/hard');
      expect(vol.readFileSync('/file', 'utf8')).toBe('data');
      expect(vol.statSync('/file').ino).toBe(vol.statSync('/hard').ino);
    });

    it('replaces an empty directory without retaining an extra child entry', () => {
      const vol = create({ '/source/file': 'data' });
      vol.mkdirSync('/destination');
      vol.renameSync('/source', '/destination');
      expect(vol.readdirSync('/')).toEqual(['destination']);
      expect(vol.readFileSync('/destination/file', 'utf8')).toBe('data');
      vol.rmSync('/destination', { recursive: true });
      expect(vol.readdirSync('/')).toEqual([]);
    });
  });

  describe('rm', () => {
    it.each([
      ['/dir', false],
      ['/dir', true],
      ['/target', false],
      ['/missing', false],
      ['/missing', true],
    ] as const)('removes the link to %s with recursive=%s', (target, recursive) => {
      const vol = create({ '/dir/file': 'data', '/target': 'target' });
      vol.symlinkSync(target, '/link');
      vol.rmSync('/link', { recursive });
      expect(() => vol.lstatSync('/link')).toThrow(/ENOENT/);
      expect(vol.readFileSync('/dir/file', 'utf8')).toBe('data');
      expect(vol.readFileSync('/target', 'utf8')).toBe('target');
    });

    it('removes dangling links with force and traverses intermediate symlinks', () => {
      const vol = create({ '/dir/file': 'data' });
      vol.symlinkSync('/dir', '/alias');
      vol.symlinkSync('/missing', '/dir/link');
      vol.rmSync('/alias/link', { force: true });
      expect(() => vol.lstatSync('/dir/link')).toThrow(/ENOENT/);
      expect(vol.readlinkSync('/alias')).toBe('/dir');
      expect(vol.readFileSync('/dir/file', 'utf8')).toBe('data');
    });

    it('keeps ordinary directory and missing-path guards', () => {
      const vol = create({ '/dir/file': 'data' });
      expect(() => vol.rmSync('/dir')).toThrow(/EISDIR/);
      expect(() => vol.rmSync('/missing')).toThrow(/ENOENT/);
      expect(() => vol.rmSync('/missing', { force: true })).not.toThrow();
      vol.rmSync('/dir', { recursive: true });
      expect(vol.existsSync('/dir')).toBe(false);
    });
  });

  describe('link', () => {
    it('rejects directory hard links without changing entries or link counts', () => {
      const vol = create({ '/dir/file': 'data' });
      const nlink = vol.statSync('/dir').nlink;
      expect(() => vol.linkSync('/dir', '/hard')).toThrow(/EPERM/);
      expect(vol.existsSync('/hard')).toBe(false);
      expect(vol.statSync('/dir').nlink).toBe(nlink);
      expect(vol.readFileSync('/dir/file', 'utf8')).toBe('data');
    });

    it('allows hard links to files and to symlinks themselves', () => {
      const vol = create({ '/file': 'data' });
      vol.symlinkSync('/missing', '/symbolic');
      vol.linkSync('/file', '/hard');
      vol.linkSync('/symbolic', '/hard-symbolic');
      expect(vol.statSync('/hard').ino).toBe(vol.statSync('/file').ino);
      expect(vol.lstatSync('/hard-symbolic').ino).toBe(vol.lstatSync('/symbolic').ino);
      expect(vol.readlinkSync('/hard-symbolic')).toBe('/missing');
    });
  });

  describe('recursive mkdir', () => {
    it.each(['/file', '/file-link'])('rejects an existing file at %s without changing it', path => {
      const vol = create({ '/file': 'data' });
      vol.symlinkSync('/file', '/file-link');
      expect(() => vol.mkdirSync(path, { recursive: true })).toThrow(/EEXIST/);
      expect(vol.readFileSync('/file', 'utf8')).toBe('data');
      expect(vol.readlinkSync('/file-link')).toBe('/file');
    });

    it.each(['/dangling', '/dangling/child', '/dangling/child/deep'])(
      'does not replace a dangling symlink while creating %s',
      path => {
        const vol = create({});
        vol.symlinkSync('/missing', '/dangling');
        expect(() => vol.mkdirSync(path, { recursive: true })).toThrow(/ENOENT/);
        expect(vol.readlinkSync('/dangling')).toBe('/missing');
        expect(vol.existsSync('/missing')).toBe(false);
      },
    );

    it('keeps valid directory symlinks and creates children through them', () => {
      const vol = create({ '/dir/existing': 'data' });
      vol.symlinkSync('/dir', '/alias');
      expect(vol.mkdirSync('/alias', { recursive: true })).toBeUndefined();
      vol.mkdirSync('/alias/new/deep', { recursive: true });
      expect(vol.statSync('/dir/new/deep').isDirectory()).toBe(true);
      expect(vol.readlinkSync('/alias')).toBe('/dir');
      expect(vol.mkdirSync('/dir/new/deep', { recursive: true })).toBeUndefined();
    });

    it.each([
      ['callback', '/dangling', 'ENOENT'],
      ['callback', '/dangling/child', 'ENOTDIR'],
      ['callback', '/dangling/child/deep', 'ENOTDIR'],
      ['promise', '/dangling', 'ENOENT'],
      ['promise', '/dangling/child', 'ENOTDIR'],
      ['promise', '/dangling/child/deep', 'ENOTDIR'],
    ])('preserves dangling links and reports %s mkdir errors for %s', async (api, path, code) => {
      const vol = create({});
      vol.symlinkSync('/missing', '/dangling');
      const result =
        api === 'promise'
          ? vol.promises.mkdir(path, { recursive: true })
          : new Promise((resolve, reject) => {
              vol.mkdir(path, { recursive: true }, (error, created) => (error ? reject(error) : resolve(created)));
            });
      await expect(result).rejects.toMatchObject({ code });
      expect(vol.readlinkSync('/dangling')).toBe('/missing');
      expect(vol.existsSync('/missing')).toBe(false);
    });
  });

  describe('symlink stats', () => {
    it.each(['file', '../missing', '/é/🦊'])('reports target UTF-8 byte length and permissions for %s', target => {
      const vol = create({});
      vol.symlinkSync(target, '/link');
      const stats = vol.lstatSync('/link');
      const bigintStats = vol.lstatSync('/link', { bigint: true });
      expect(stats.isSymbolicLink()).toBe(true);
      expect(stats.size).toBe(Buffer.byteLength(target));
      expect(stats.mode & 0o777).toBe(0o777);
      expect(bigintStats.size).toBe(BigInt(Buffer.byteLength(target)));
      expect(bigintStats.mode & BigInt(0o777)).toBe(BigInt(0o777));
    });
  });

  it('exposes corrected leaf behavior through callbacks and promises', async () => {
    const vol = create({ '/target/file': 'data' });
    vol.symlinkSync('/target', '/link');
    await new Promise<void>((resolve, reject) => {
      vol.rename('/link', '/renamed', error => (error ? reject(error) : resolve()));
    });
    expect(vol.readlinkSync('/renamed')).toBe('/target');
    await vol.promises.rm('/renamed', { recursive: true });
    expect(vol.readFileSync('/target/file', 'utf8')).toBe('data');
    await expect(vol.promises.link('/target', '/hard')).rejects.toMatchObject({ code: 'EPERM' });
    vol.symlinkSync('/missing', '/dangling');
    await expect(vol.promises.mkdir('/dangling', { recursive: true })).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
