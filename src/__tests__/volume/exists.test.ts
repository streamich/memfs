import { create } from '../util';

describe('exists(path, callback)', () => {
  const vol = create();
  it('Returns true if file exists', done => {
    vol.exists('/foo', exists => {
      expect(exists).toEqual(true);
      done();
    });
  });
  it('Returns false if file does not exist', done => {
    vol.exists('/foo2', exists => {
      expect(exists).toEqual(false);
      done();
    });
  });
  it('Throws correct error if callback not provided', done => {
    try {
      vol.exists('/foo', undefined as any);
      throw new Error('not_this');
    } catch (err) {
      expect(err.message).toEqual('callback must be a function');
      done();
    }
  });
  it('invalid path type should throw', () => {
    try {
      vol.exists(123 as any, () => {});
      throw new Error('not_this');
    } catch (err) {
      expect(err.message !== 'not_this').toEqual(true);
    }
  });
  it('gives false if permissions on containing directory are insufficient', done => {
    // Experimentally determined: fs.exists treats missing permissions as "file does not exist",
    // presumably because due to the non-standard callback signature there is no way to signal
    // that permissions were insufficient
    const vol = create({ '/foo/bar': 'test' });
    vol.chmodSync('/foo', 0o666); // rw across the board
    vol.exists('/foo/bar', exists => {
      try {
        expect(exists).toEqual(false);
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});
