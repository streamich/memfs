import { create, tryGetChildNode } from '../util';
import { Node } from '../../node';

describe('writeFileSync(path, data[, options])', () => {
  const data = 'asdfasidofjasdf';
  it('Create a file at root (/writeFileSync.txt)', () => {
    const vol = create();
    vol.writeFileSync('/writeFileSync.txt', data);

    const node = tryGetChildNode(vol.root, 'writeFileSync.txt');
    expect(node).toBeInstanceOf(Node);
    expect(node.getString()).toBe(data);
  });
  it('Write to file by file descriptor', () => {
    const vol = create();
    const fd = vol.openSync('/writeByFd.txt', 'w');
    vol.writeFileSync(fd, data);
    const node = tryGetChildNode(vol.root, 'writeByFd.txt');
    expect(node).toBeInstanceOf(Node);
    expect(node.getString()).toBe(data);
  });
  it('Write to two files (second by fd)', () => {
    const vol = create();

    // 1
    vol.writeFileSync('/1.txt', '123');

    // 2, 3, 4
    const fd2 = vol.openSync('/2.txt', 'w');
    const fd3 = vol.openSync('/3.txt', 'w');
    const fd4 = vol.openSync('/4.txt', 'w');

    vol.writeFileSync(fd2, '456');

    expect(tryGetChildNode(vol.root, '1.txt').getString()).toBe('123');
    expect(tryGetChildNode(vol.root, '2.txt').getString()).toBe('456');
  });
  it('Write at relative path that does not exist throws correct error', () => {
    const vol = create();
    try {
      vol.writeFileSync('a/b', 'c');
      throw new Error('not_this');
    } catch (err) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('Write throws EACCES without sufficient permissions on containing directory', () => {
    const perms = [
      0o666, // rw
      0o555  // rx, only when target file does not exist yet
    ]
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

  it('Write throws EACCES if file exists but has insufficient permissions', () => {
    const vol = create({ '/foo/test': 'test' });
    vol.chmodSync('/foo/test', 0o555); // rx
    expect(() => {
      vol.writeFileSync('/foo/test', 'test');
    }).toThrowError(/EACCES/);
  });
});
