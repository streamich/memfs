import { createFs } from '../util';

describe('ReadStream', () => {
  it('fs has ReadStream constructor', () => {
    const fs = createFs();
    expect(typeof fs.ReadStream).toEqual('function');
  });
  it('ReadStream has constructor and prototype property', () => {
    const fs = createFs();
    expect(typeof fs.ReadStream.constructor).toEqual('function');
    expect(typeof fs.ReadStream.prototype).toEqual('object');
  });
  it('Can read basic file', done => {
    const fs = createFs({ '/a': 'b' });
    const rs = new fs.ReadStream('/a', 'utf8');
    rs.on('data', data => {
      expect(String(data)).toEqual('b');
      done();
    });
  });
});
