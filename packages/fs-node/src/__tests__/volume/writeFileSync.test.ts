import { create, tryGetChildNode } from '../util';
import { Node } from '@jsonjoy.com/fs-core';
import { constants } from '@jsonjoy.com/fs-node-utils';

const { O_WRONLY, O_CREAT, O_TRUNC, O_NOFOLLOW } = constants;

describe('writeFileSync(path, data[, options])', () => {
  const data = 'asdfasidofjasdf';

  it('create a file at root (/writeFileSync.txt)', () => {
    const vol = create();
    vol.writeFileSync('/writeFileSync.txt', data);

    const node = tryGetChildNode(vol._core.root, 'writeFileSync.txt');
    expect(node).toBeInstanceOf(Node);
    expect(node.getString()).toBe(data);
  });

  it('write to file by file descriptor', () => {
    const vol = create();
    const fd = vol.openSync('/writeByFd.txt', 'w');
    vol.writeFileSync(fd, data);
    const node = tryGetChildNode(vol._core.root, 'writeByFd.txt');
    expect(node).toBeInstanceOf(Node);
    expect(node.getString()).toBe(data);
  });

  it('write to two files (second by fd)', () => {
    const vol = create();

    // 1
    vol.writeFileSync('/1.txt', '123');

    // 2, 3, 4
    const fd2 = vol.openSync('/2.txt', 'w');
    const fd3 = vol.openSync('/3.txt', 'w');
    const fd4 = vol.openSync('/4.txt', 'w');

    vol.writeFileSync(fd2, '456');

    expect(tryGetChildNode(vol._core.root, '1.txt').getString()).toBe('123');
    expect(tryGetChildNode(vol._core.root, '2.txt').getString()).toBe('456');
  });
  it('write at relative path that does not exist throws correct error', () => {
    const vol = create();
    try {
      vol.writeFileSync('a/b', 'c');
      throw new Error('not_this');
    } catch (err) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('write throws EACCES if file exists but has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo/test', 0o555); // rx
    expect(() => {
      vol.writeFileSync('/foo/test', 'test');
    }).toThrowError(/EACCES/);
  });

  it('write throws EACCES without sufficient permissions on containing directory', () => {
    const perms = [
      0o666, // rw
      0o555, // rx, only when target file does not exist yet
    ];
    perms.forEach(perm => {
      const vol = create({});
      vol.mkdirSync('/foo');
      vol.chmodSync('/foo', perm);
      expect(() => {
        vol.writeFileSync('/foo/test', 'test');
      }).toThrowError(/EACCES/);
    });

    // If the target file exists, it should not care about the write permission on containing dir
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo', 0o555); // rx, should be enough
    expect(() => {
      vol.writeFileSync('/foo/test', 'test');
    }).not.toThrowError();
  });

  it('write throws EACCES without sufficient permissions on intermediate directory', () => {
    const vol = create({});
    vol.mkdirSync('/foo');
    vol.chmodSync('/', 0o666); // rw
    expect(() => {
      vol.writeFileSync('/foo/test', 'test');
    }).toThrowError(/EACCES/);
  });

  it('throws ELOOP when flag has O_NOFOLLOW and the path is a symlink', () => {
    const vol = create({ '/file': 'content' });
    vol.symlinkSync('/file', '/link');
    expect(() => vol.writeFileSync('/link', 'new', { flag: O_WRONLY | O_CREAT | O_TRUNC | O_NOFOLLOW })).toThrow(
      expect.objectContaining({ code: 'ELOOP' }),
    );
    expect(vol.readFileSync('/file', 'utf8')).toBe('content');
  });

  it('writes through a dangling symlink into its target', () => {
    const vol = create({});
    vol.symlinkSync('/target', '/dangling');
    vol.writeFileSync('/dangling', data);
    expect(vol.readFileSync('/target', 'utf8')).toBe(data);
    expect(vol.lstatSync('/dangling').isSymbolicLink()).toBe(true);
  });

  it('throws EISDIR for a path with a trailing slash and creates nothing', () => {
    const vol = create({});
    expect(() => vol.writeFileSync('/new/', data)).toThrow(expect.objectContaining({ code: 'EISDIR' }));
    expect(vol.existsSync('/new')).toBe(false);
  });
});
