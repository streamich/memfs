import { Volume } from '../volume';
import type { IProcess } from '@jsonjoy.com/fs-core';

const makeProcess = (overrides: Partial<IProcess> = {}): IProcess => ({
  cwd: () => '/',
  platform: 'linux',
  emitWarning: () => {},
  env: {},
  ...overrides,
});

describe('Volume with custom process', () => {
  describe('Volume.fromJSON', () => {
    it('uses custom cwd() from process when no cwd is given', () => {
      const customProcess = makeProcess({ cwd: () => '/app' });
      const vol = Volume.fromJSON({ 'data.txt': 'hello' }, undefined, { process: customProcess });
      expect(vol.readFileSync('/app/data.txt', 'utf8')).toBe('hello');
    });

    it('uses explicit cwd over process.cwd()', () => {
      const customProcess = makeProcess({ cwd: () => '/ignored' });
      const vol = Volume.fromJSON({ 'data.txt': 'hi' }, '/explicit', { process: customProcess });
      expect(vol.readFileSync('/explicit/data.txt', 'utf8')).toBe('hi');
    });
  });

  describe('Volume.fromNestedJSON', () => {
    it('uses custom cwd() from process when no cwd is given', () => {
      const customProcess = makeProcess({ cwd: () => '/nested' });
      const vol = Volume.fromNestedJSON({ 'sub/file.txt': 'content' }, undefined, { process: customProcess });
      expect(vol.readFileSync('/nested/sub/file.txt', 'utf8')).toBe('content');
    });
  });

  describe('custom getuid / getgid', () => {
    it('stores uid and gid from custom process on created files', () => {
      const customProcess = makeProcess({ getuid: () => 42, getgid: () => 99 });
      const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: customProcess });
      const stat = vol.statSync('/file.txt');
      expect(stat.uid).toBe(42);
      expect(stat.gid).toBe(99);
    });
  });
});
