import Stats from './Stats';
import Dirent from './Dirent';
import {
  Volume as _Volume,
  StatWatcher,
  FSWatcher,
  toUnixTimestamp,
  IReadStream,
  IWriteStream,
  DirectoryJSON,
} from './volume';
const { fsSyncMethods, fsAsyncMethods } = require('fs-monkey/lib/util/lists');
import { constants } from './constants';
import type {FsPromisesApi} from './node/types';
const { F_OK, R_OK, W_OK, X_OK } = constants;

export { DirectoryJSON };
export const Volume = _Volume;

// Default volume.
export const vol = new _Volume();

export interface IFs extends _Volume {
  constants: typeof constants;
  Stats: new (...args) => Stats;
  Dirent: new (...args) => Dirent;
  StatWatcher: new () => StatWatcher;
  FSWatcher: new () => FSWatcher;
  ReadStream: new (...args) => IReadStream;
  WriteStream: new (...args) => IWriteStream;
  promises: FsPromisesApi;
  _toUnixTimestamp;
}

export function createFsFromVolume(vol: _Volume): IFs {
  const fs = { F_OK, R_OK, W_OK, X_OK, constants, Stats, Dirent } as any as IFs;

  // Bind FS methods.
  for (const method of fsSyncMethods) if (typeof vol[method] === 'function') fs[method] = vol[method].bind(vol);
  for (const method of fsAsyncMethods) if (typeof vol[method] === 'function') fs[method] = vol[method].bind(vol);

  fs.StatWatcher = vol.StatWatcher;
  fs.FSWatcher = vol.FSWatcher;
  fs.WriteStream = vol.WriteStream;
  fs.ReadStream = vol.ReadStream;
  fs.promises = vol.promises;

  fs._toUnixTimestamp = toUnixTimestamp;
  (fs as any).__vol = vol;

  return fs;
}

export const fs: IFs = createFsFromVolume(vol);

/**
 * Creates a new file system instance.
 *
 * @param json File system structure expressed as a JSON object.
 *        Use `null` for empty directories and empty string for empty files.
 * @param cwd Current working directory. The JSON structure will be created
 *        relative to this path.
 * @returns A `memfs` file system instance, which is a drop-in replacement for
 *          the `fs` module.
 */
export const memfs = (json: DirectoryJSON = {}, cwd: string = '/'): IFs => {
  const volume = Volume.fromJSON(json, cwd);
  const fs = createFsFromVolume(volume);
  return fs;
};

export type IFsWithVolume = IFs & { __vol: _Volume };

declare let module;
module.exports = { ...module.exports, ...fs };
module.exports.semantic = true;
