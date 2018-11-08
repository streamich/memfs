import { Volume } from '../volume';
import { constants } from '../constants';
const memfs = require('../index');
import { fsSyncMethods, fsAsyncMethods } from 'fs-monkey/lib/util/lists';

describe('memfs', () => {
  it('Exports Volume constructor', () => {
    expect(typeof memfs.Volume).toBe('function');
    expect(memfs.Volume).toBe(Volume);
  });
  it('Exports constants', () => {
    expect(memfs.F_OK).toBe(constants.F_OK);
    expect(memfs.R_OK).toBe(constants.R_OK);
    expect(memfs.W_OK).toBe(constants.W_OK);
    expect(memfs.X_OK).toBe(constants.X_OK);
    expect(memfs.constants).toEqual(constants);
  });
  it('Exports constructors', () => {
    expect(typeof memfs.Stats).toBe('function');
    expect(typeof memfs.Dirent).toBe('function');
    expect(typeof memfs.ReadStream).toBe('function');
    expect(typeof memfs.WriteStream).toBe('function');
    expect(typeof memfs.FSWatcher).toBe('function');
    expect(typeof memfs.StatWatcher).toBe('function');
  });
  it('Exports _toUnixTimestamp', () => {
    expect(typeof memfs._toUnixTimestamp).toBe('function');
  });
  it("Exports all Node's filesystem API methods", () => {
    for (const method of fsSyncMethods) {
      expect(typeof memfs[method]).toBe('function');
    }
    for (const method of fsAsyncMethods) {
      expect(typeof memfs[method]).toBe('function');
    }
  });
  it('Exports promises API', () => {
    expect(typeof memfs.promises).toBe('object');
  });
});
