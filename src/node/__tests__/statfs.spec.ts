import { Volume } from '../volume';
import StatFs from '../StatFs';

describe('statfs API', () => {
  describe('.statfsSync(path)', () => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file.txt', 'hello world');

    it('Returns StatFs instance', () => {
      const statfs = vol.statfsSync('/test');
      expect(statfs).toBeInstanceOf(StatFs);
    });

    it('Returns filesystem statistics', () => {
      const statfs = vol.statfsSync('/');
      expect(typeof statfs.type).toBe('number');
      expect(typeof statfs.bsize).toBe('number');
      expect(typeof statfs.blocks).toBe('number');
      expect(typeof statfs.bfree).toBe('number');
      expect(typeof statfs.bavail).toBe('number');
      expect(typeof statfs.files).toBe('number');
      expect(typeof statfs.ffree).toBe('number');

      expect(statfs.bsize).toBeGreaterThan(0);
      expect(statfs.blocks).toBeGreaterThan(0);
      expect(statfs.files).toBeGreaterThan(0);
    });

    it('Works with bigint option', () => {
      const statfs = vol.statfsSync('/', { bigint: true });
      expect(typeof statfs.type).toBe('bigint');
      expect(typeof statfs.bsize).toBe('bigint');
      expect(typeof statfs.blocks).toBe('bigint');
      expect(typeof statfs.bfree).toBe('bigint');
      expect(typeof statfs.bavail).toBe('bigint');
      expect(typeof statfs.files).toBe('bigint');
      expect(typeof statfs.ffree).toBe('bigint');
    });

    it('Throws when path does not exist', () => {
      expect(() => vol.statfsSync('/nonexistent')).toThrow();
    });

    it('Works with different paths in same filesystem', () => {
      const statfs1 = vol.statfsSync('/');
      const statfs2 = vol.statfsSync('/test');

      // Should return same filesystem stats for any path
      expect(statfs1.type).toBe(statfs2.type);
      expect(statfs1.bsize).toBe(statfs2.bsize);
      expect(statfs1.blocks).toBe(statfs2.blocks);
    });
  });

  describe('.statfs(path, callback)', () => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file.txt', 'hello world');

    it('Calls callback with StatFs instance', done => {
      vol.statfs('/test', (err, statfs) => {
        expect(err).toBeNull();
        expect(statfs).toBeInstanceOf(StatFs);
        expect(statfs).toBeDefined();
        expect(typeof statfs!.type).toBe('number');
        expect(statfs!.bsize).toBeGreaterThan(0);
        done();
      });
    });

    it('Works with bigint option', done => {
      vol.statfs('/', { bigint: true }, (err, statfs) => {
        expect(err).toBeNull();
        expect(statfs).toBeDefined();
        expect(typeof statfs!.type).toBe('bigint');
        expect(typeof statfs!.bsize).toBe('bigint');
        done();
      });
    });

    it('Calls callback with error when path does not exist', done => {
      vol.statfs('/nonexistent', (err, statfs) => {
        expect(err).toBeTruthy();
        expect(err).toBeDefined();
        expect(err!.code).toBe('ENOENT');
        expect(statfs).toBeUndefined();
        done();
      });
    });
  });
});
