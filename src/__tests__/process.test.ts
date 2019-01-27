import _process, { createProcess, SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS } from '../process';

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
      expect(!!proc.env[SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS]).toBe(false);
    });
  });
  test('createProcess with env variable', () => {
    process.env[SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS] = 'true';
    const proc = createProcess();
    expect(!!proc.env[SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS]).toBe(true);
    delete process.env[SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS];
  });
});
