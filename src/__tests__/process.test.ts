import _process, { createProcess } from '../process';

describe('process', () => {
  describe('createProcess', () => {
    const proc = createProcess();
    it('Exports default object', () => {
      expect(typeof _process).toBe('object');
    });
    it('.getuid() and .getgid()', () => {
      expect(typeof proc.getuid()).toBe('number');
      expect(typeof proc.getgid()).toBe('number');
    });
    it('.cwd()', () => {
      expect(typeof proc.cwd()).toBe('string');
    });
    it('.nextTick()', done => {
      expect(typeof proc.nextTick).toBe('function');
      proc.nextTick(done);
    });
    it('.env', () => {
      expect(typeof proc.env).toBe('object');
      expect(!!proc.env.MEMFS_DONT_WARN).toBe(false);
    });
  });
  describe('using MEMFS_DONT_WARN', () => {
    it('should be assignable to the process.env, and returned by createProcess', () => {
      process.env.MEMFS_DONT_WARN = 'true';
      const proc = createProcess();
      expect(!!proc.env.MEMFS_DONT_WARN).toBe(true);
      delete process.env.MEMFS_DONT_WARN;
    });
    it('should by default show warnings (in volume.ts)', () => {
      const proc = createProcess();
      const promisesWarn = !proc.env.MEMFS_DONT_WARN;
      expect(promisesWarn).toBe(true);
    });
  });
});
