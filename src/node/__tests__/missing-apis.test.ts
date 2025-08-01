import { Volume } from '../volume';

describe('Missing APIs', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('glob APIs', () => {
    it('globSync should throw "Not implemented"', () => {
      expect(() => vol.globSync('*.js')).toThrow('Not implemented');
    });

    it('glob should throw "Not implemented"', () => {
      expect(() => vol.glob('*.js', () => {})).toThrow('Not implemented');
    });

    it('promises.glob should throw "Not implemented"', async () => {
      await expect(vol.promises.glob('*.js')).rejects.toThrow('Not implemented');
    });
  });
});
