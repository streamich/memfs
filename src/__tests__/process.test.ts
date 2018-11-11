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
  });
});
