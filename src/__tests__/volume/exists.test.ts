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
});
