import { Volume } from '../..';

const create = (json = { '/foo': 'bar' }) => {
  const vol = Volume.fromJSON(json);
  return vol;
};

describe('write(fs, str, position, encoding, callback)', () => {
  it('Simple write to file', done => {
    const vol = create();
    const fd = vol.openSync('/test', 'w');
    vol.write(fd, 'lol', 0, 'utf8', (err, bytes, str) => {
      expect(err).toEqual(null);
      expect(bytes).toEqual(3);
      expect(str).toEqual('lol');
      expect(vol.readFileSync('/test', 'utf8')).toEqual('lol');
      done();
    });
  });

  /* 
   * No need for permissions tests, because write requires a file descriptor, which can only be 
   * obtained from open or openSync.
   */
});
