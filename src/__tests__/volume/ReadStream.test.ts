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
    new fs.ReadStream('/test')
      .on('error', err => {
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      })
      .on('open', () => {
        done(new Error("Expected ReadStream to emit EACCES but it didn't"));
      });
  });

  it('should emit EACCES error when containing directory has insufficient permissions', done => {
    const fs = createFs({ '/foo/test': 'test' });
    fs.chmodSync('/foo', 0o666); // rw
    new fs.ReadStream('/foo/test')
      .on('error', err => {
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      })
      .on('open', () => {
        done(new Error("Expected ReadStream to emit EACCES but it didn't"));
      });
  });

  it('should emit EACCES error when intermediate directory has insufficient permissions', done => {
    const fs = createFs({ '/foo/test': 'test' });
    fs.chmodSync('/', 0o666); // rw
    new fs.ReadStream('/foo/test')
      .on('error', err => {
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      })
      .on('open', () => {
        done(new Error("Expected ReadStream to emit EACCES but it didn't"));
      });
  });

  it('should handle createReadStream with start parameter', done => {
    const fs = createFs();
    fs.writeFileSync('/streamTest', '# Hello World');
    const rs = fs.createReadStream('/streamTest', { encoding: 'utf8', start: 0 });
    let data = '';
    rs.on('data', chunk => {
      data += chunk;
    });
    rs.on('end', () => {
      expect(data).toEqual('# Hello World');
      done();
    });
    rs.on('error', err => {
      done(err);
    });
  });

  it('should handle createReadStream with start parameter beyond file length', done => {
    const fs = createFs();
    fs.writeFileSync('/streamTest', 'short');
    const rs = fs.createReadStream('/streamTest', { encoding: 'utf8', start: 100 });
    let data = '';
    rs.on('data', chunk => {
      data += chunk;
    });
    rs.on('end', () => {
      expect(data).toEqual('');
      done();
    });
    rs.on('error', err => {
      done(err);
    });
  });
});
