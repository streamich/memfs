import {
  Stats,
  Dirent,
  Volume,
  StatWatcher,
  FSWatcher,
  toUnixTimestamp,
  fsSynchronousApiList,
  fsCallbackApiList,
} from '@jsonjoy.com/fs-node';
import type { IWriteStream } from '@jsonjoy.com/fs-node';
import { DirectoryJSON, NestedDirectoryJSON } from '@jsonjoy.com/fs-core';
import { constants } from '@jsonjoy.com/fs-node-utils';
import type { FsPromisesApi } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

const { F_OK, R_OK, W_OK, X_OK } = constants;

export { DirectoryJSON, NestedDirectoryJSON, Volume };

// Default volume.
export const vol = new Volume();

export interface IFs extends Volume {
  constants: typeof constants;
  Stats: new (...args) => Stats;
  Dirent: new (...args) => Dirent;
  StatWatcher: new () => StatWatcher;
  FSWatcher: new () => FSWatcher;
  ReadStream: new (...args) => misc.IReadStream;
  WriteStream: new (...args) => IWriteStream;
  promises: FsPromisesApi;
  _toUnixTimestamp;
}

export function createFsFromVolume(vol: Volume): IFs {
  const fs = { F_OK, R_OK, W_OK, X_OK, constants, Stats, Dirent } as any as IFs;

  // Bind FS methods.
  for (const method of fsSynchronousApiList) if (typeof vol[method] === 'function') fs[method] = vol[method].bind(vol);
  for (const method of fsCallbackApiList) if (typeof vol[method] === 'function') fs[method] = vol[method].bind(vol);

  fs.StatWatcher = vol.StatWatcher;
  fs.FSWatcher = vol.FSWatcher;
  fs.WriteStream = vol.WriteStream;
  fs.ReadStream = vol.ReadStream;
  fs.promises = vol.promises;

  // Handle realpath and realpathSync with their .native properties
  if (typeof vol.realpath === 'function') {
    fs.realpath = vol.realpath.bind(vol);
    if (typeof vol.realpath.native === 'function') {
      fs.realpath.native = vol.realpath.native.bind(vol);
    }
  }
  if (typeof vol.realpathSync === 'function') {
    fs.realpathSync = vol.realpathSync.bind(vol);
    if (typeof vol.realpathSync.native === 'function') {
      fs.realpathSync.native = vol.realpathSync.native.bind(vol);
    }
  }

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
export const memfs = (json: NestedDirectoryJSON = {}, cwd: string = '/'): { fs: IFs; vol: Volume } => {
  const vol = Volume.fromNestedJSON(json, cwd);
  const fs = createFsFromVolume(vol);
  return { fs, vol };
};

export type IFsWithVolume = IFs & { __vol: Volume };

declare let module;
module.exports = { ...module.exports, ...fs };
module.exports.semantic = true;
