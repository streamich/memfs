import { Superblock } from '../Superblock';
import type { IProcess } from '../process';

const makeProcess = (overrides: Partial<IProcess> = {}): IProcess => ({
  cwd: () => '/',
  platform: 'linux',
  emitWarning: () => {},
  env: {},
  ...overrides,
});

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
});
