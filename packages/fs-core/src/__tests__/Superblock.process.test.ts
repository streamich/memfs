import { Superblock } from '../Superblock';
import type { IProcess } from '../process';

const makeProcess = (overrides: Partial<IProcess> = {}): IProcess => ({
  cwd: () => '/',
  platform: 'linux',
  emitWarning: () => {},
  env: {},
  ...overrides,
});

// POSIX flag constants (O_RDONLY = 0, O_WRONLY = 1, O_RDWR = 2)
const O_RDONLY = 0;

describe('Superblock with custom process', () => {
  describe('fromJSON / fromNestedJSON', () => {
    it('uses custom cwd() when no cwd argument is given', () => {
      const customProcess = makeProcess({ cwd: () => '/custom' });
      const sb = Superblock.fromJSON({ 'file.txt': 'hello' }, undefined, { process: customProcess });
      const link = sb.getResolvedLink('/custom/file.txt');
      expect(link).not.toBeNull();
      expect(link!.getNode().getString()).toBe('hello');
    });

    it('uses provided cwd argument instead of process.cwd()', () => {
      const customProcess = makeProcess({ cwd: () => '/ignored' });
      const sb = Superblock.fromJSON({ 'file.txt': 'hi' }, '/explicit', { process: customProcess });
      const link = sb.getResolvedLink('/explicit/file.txt');
      expect(link).not.toBeNull();
    });

    it('fromNestedJSON uses custom cwd()', () => {
      const customProcess = makeProcess({ cwd: () => '/nested' });
      const sb = Superblock.fromNestedJSON({ 'a/b.txt': 'data' }, undefined, { process: customProcess });
      const link = sb.getResolvedLink('/nested/a/b.txt');
      expect(link).not.toBeNull();
    });
  });

  describe('createNode', () => {
    it('uses custom getuid() and getgid() for new nodes', () => {
      const customProcess = makeProcess({ getuid: () => 1234, getgid: () => 5678 });
      const sb = new Superblock({ process: customProcess });
      const node = sb.createNode(0o644);
      expect(node.uid).toBe(1234);
      expect(node.gid).toBe(5678);
    });

    it('defaults uid/gid to 0 when getuid/getgid are not defined', () => {
      const customProcess = makeProcess();
      const sb = new Superblock({ process: customProcess });
      const node = sb.createNode(0o644);
      expect(node.uid).toBe(0);
      expect(node.gid).toBe(0);
    });
  });

  describe('walk (platform-dependent error codes)', () => {
    it('returns ENOTDIR on non-win32 platform when traversing through a file', () => {
      const customProcess = makeProcess({ platform: 'linux' });
      const sb = Superblock.fromJSON({ '/dir/file.txt': 'content' }, '/', { process: customProcess });
      const result = sb.walk('/dir/file.txt/child', false, true, false);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.err.code).toBe('ENOTDIR');
    });

    it('returns ENOENT on win32 platform when traversing through a file', () => {
      const customProcess = makeProcess({ platform: 'win32' });
      const sb = Superblock.fromJSON({ '/dir/file.txt': 'content' }, '/', { process: customProcess });
      const result = sb.walk('/dir/file.txt/child', false, true, false);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.err.code).toBe('ENOENT');
    });
  });

  describe('process property', () => {
    it('exposes the stored process object', () => {
      const customProcess = makeProcess({ platform: 'win32' });
      const sb = new Superblock({ process: customProcess });
      expect(sb.process).toBe(customProcess);
    });

    it('defaults to the global process when no process option is given', () => {
      const sb = new Superblock();
      expect(typeof sb.process.cwd).toBe('function');
      expect(typeof sb.process.platform).toBe('string');
    });
  });

  describe('permission checks use custom process uid/gid', () => {
    it('open denies read access when custom uid has no read permission', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = Superblock.fromJSON({ '/secret.txt': 'data' }, '/', { process: customProcess });
      const link = sb.getResolvedLink('/secret.txt')!;
      link.getNode().chmod(0o000); // no permissions
      link.getNode().chown(0, 0); // owned by root
      expect(() => sb.open('/secret.txt', O_RDONLY, 0o666, true)).toThrow(expect.objectContaining({ code: 'EACCES' }));
    });

    it('open grants read access when custom uid matches file owner with read permission', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = Superblock.fromJSON({ '/myfile.txt': 'data' }, '/', { process: customProcess });
      const link = sb.getResolvedLink('/myfile.txt')!;
      link.getNode().chmod(0o400); // owner read-only
      link.getNode().chown(1000, 1000);
      expect(() => sb.open('/myfile.txt', O_RDONLY, 0o666, true)).not.toThrow();
    });

    it('mkdir denies creation when custom uid has no write permission on parent dir', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = new Superblock({ process: customProcess });
      sb.root.getNode().chmod(0o555); // no write
      sb.root.getNode().chown(0, 0); // owned by root
      expect(() => sb.mkdir('/newdir', 0o755)).toThrow(expect.objectContaining({ code: 'EACCES' }));
    });

    it('symlink denies creation when custom uid has no write permission on parent dir', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = new Superblock({ process: customProcess });
      sb.root.getNode().chmod(0o555); // no write
      sb.root.getNode().chown(0, 0); // owned by root
      expect(() => sb.symlink('/target', '/link')).toThrow(expect.objectContaining({ code: 'EACCES' }));
    });

    it('rm denies deletion when custom uid has no write permission on parent dir', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = Superblock.fromJSON({ '/file.txt': '' }, '/', { process: customProcess });
      sb.root.getNode().chmod(0o555); // no write
      sb.root.getNode().chown(0, 0); // owned by root
      expect(() => sb.rm('/file.txt', false, false)).toThrow(expect.objectContaining({ code: 'EACCES' }));
    });

    it('rename denies when custom uid has no write permission on parent dir', () => {
      const customProcess = makeProcess({ getuid: () => 1000, getgid: () => 1000 });
      const sb = Superblock.fromJSON({ '/file.txt': '' }, '/', { process: customProcess });
      sb.root.getNode().chmod(0o555); // no write
      sb.root.getNode().chown(0, 0); // owned by root
      expect(() => sb.rename('/file.txt', '/file2.txt')).toThrow(expect.objectContaining({ code: 'EACCES' }));
    });
  });
});
