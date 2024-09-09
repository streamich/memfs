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

  it('should emit EACCES error when file has insufficient permissions', done => {
    const fs = createFs({ '/test': 'test' });
    fs.chmodSync('/test', 0o333); // wx
    new fs.ReadStream('/test').on('error', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EACCES');
      done();
    }).on('open', () => {
      done(new Error('Expected ReadStream to emit EACCES but it didn\'t'));
    });;
  });

  it('should emit EACCES error when containing directory has insufficient permissions', done => {
    const fs = createFs({ '/foo/test': 'test' });
    fs.chmodSync('/foo', 0o666); // rw
    new fs.ReadStream('/foo/test').on('error', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EACCES');
      done();
    }).on('open', () => {
      done(new Error('Expected ReadStream to emit EACCES but it didn\'t'));
    });    
  });
});
