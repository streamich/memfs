import { create } from '../util';

describe('renameSync(fromPath, toPath)', () => {
  it('Renames a simple case', done => {
    const vol = create({ '/foo': 'bar' });
    vol.rename('/foo', '/foo2', (err, res) => {
      expect(vol.toJSON()).toEqual({ '/foo2': 'bar' });
      done();
    });
  });
});
