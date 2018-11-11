import { createFs } from '../util';

describe('WriteStream', () => {
  it('fs has WriteStream constructor', () => {
    const fs = createFs();
    expect(typeof fs.WriteStream).toBe('function');
  });
  it('WriteStream has constructor and prototype property', () => {
    const fs = createFs();
    expect(typeof fs.WriteStream.constructor).toBe('function');
    expect(typeof fs.WriteStream.prototype).toBe('object');
  });
  it('Can write basic file', done => {
    const fs = createFs({ '/a': 'b' });
    const ws = new fs.WriteStream('/a', 'utf8');
    ws.end('d');
    ws.on('finish', () => {
      expect(fs.readFileSync('/a', 'utf8')).toBe('d');
      done();
    });
  });
});
