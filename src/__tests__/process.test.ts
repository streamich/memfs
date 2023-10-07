import _process, { createProcess } from '../process';

describe('process', () => {
  describe('createProcess', () => {
    const proc = createProcess();
    it('Exports default object', () => {
      expect(typeof _process).toBe('object');
    });
    it('.cwd()', () => {
      expect(typeof proc.cwd()).toBe('string');
    });
    it('.env', () => {
      expect(typeof proc.env).toBe('object');
    });
  });
});
