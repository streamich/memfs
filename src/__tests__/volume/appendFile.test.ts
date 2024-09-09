import { create, multitest } from '../util';

describe('appendFile(file, data[, options], callback)', () => {
  it('Simple write to non-existing file', done => {
    const vol = create();
    vol.appendFile('/test', 'hello', (err, res) => {
      expect(vol.readFileSync('/test', 'utf8')).toEqual('hello');
      done();
    });
  });
  it('Append to existing file', done => {
    const vol = create({ '/a': 'b' });
    vol.appendFile('/a', 'c', (err, res) => {
      expect(vol.readFileSync('/a', 'utf8')).toEqual('bc');
      done();
    });
  });

  it('Appending gives EACCES without sufficient permissions', done => {
    const vol = create({ '/foo': 'foo' });
    vol.chmodSync('/foo', 0o555); // rx across the board
    vol.appendFile('/foo', 'bar', err => {
      try {
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('code', 'EACCES');
        done();
      } catch(x) {
        done(x);
      }
    });
  });

  it('Appending gives EACCES if file does not exist and containing directory has insufficient permissions', _done => {
    const perms = [
      0o555, // rx across the board
      0o666  // rw across the board
    ];
    const done = multitest(_done, perms.length);
    
    perms.forEach(perm => {
    const vol = create({});
      vol.mkdirSync('/foo', { mode: perm });
      vol.appendFile('/foo/test', 'bar', err => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('code', 'EACCES');
          done();
        } catch(x) {
          done(x);
        }
      });
    })
  });
});
