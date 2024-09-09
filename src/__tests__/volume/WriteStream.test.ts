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

  it('should emit EACCES error when file has insufficient permissions', done => {
    const fs = createFs({ '/test': 'test' });
    fs.chmodSync('/test', 0o555); // rx
    new fs.WriteStream('/test').on('error', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EACCES');
      done();
    }).on('open', () => {
      done(new Error('Expected WriteStream to emit EACCES but it didn\'t'));
    });;
  });

  it('should emit EACCES error for an existing file when containing directory has insufficient permissions', done => {
    const fs = createFs({ '/foo/test': 'test' });
    fs.chmodSync('/foo', 0o666); // rw
    new fs.WriteStream('/foo/test').on('error', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EACCES');
      done();
    }).on('open', () => {
      done(new Error('Expected WriteStream to emit EACCES but it didn\'t'));
    });    
  });

  it('should emit EACCES error for an non-existant file when containing directory has insufficient permissions', done => {
    const fs = createFs({});
    fs.mkdirSync('/foo', { mode: 0o555 }); // rx    
    new fs.WriteStream('/foo/test').on('error', err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('code', 'EACCES');
      done();
    }).on('open', () => {
      done(new Error('Expected WriteStream to emit EACCES but it didn\'t'));
    });    
  });
});
