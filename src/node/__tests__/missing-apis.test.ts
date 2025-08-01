import { Volume } from '../volume';

describe('Missing APIs', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('openAsBlob API', () => {
    it('should throw "Not implemented"', () => {
      expect(() => vol.openAsBlob('/test/file.txt')).toThrow('Not implemented');
    });
  });

  describe('statfs APIs', () => {
    it('statfsSync should throw "Not implemented"', () => {
      expect(() => vol.statfsSync('/test')).toThrow('Not implemented');
    });

    it('statfs should throw "Not implemented"', () => {
      expect(() => vol.statfs('/test', () => {})).toThrow('Not implemented');
    });

    it('promises.statfs should throw "Not implemented"', async () => {
      await expect(vol.promises.statfs('/test')).rejects.toThrow('Not implemented');
    });
  });
});
