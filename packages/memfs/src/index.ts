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
import { DirectoryJSON, NestedDirectoryJSON, type IProcess } from '@jsonjoy.com/fs-core';
import { constants } from '@jsonjoy.com/fs-node-utils';
import type { FsPromisesApi } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

const { F_OK, R_OK, W_OK, X_OK } = constants;

export { DirectoryJSON, NestedDirectoryJSON, Volume };
export type { IProcess };

const getGlobalProcess = (): Partial<IProcess> => {
  const maybeProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
  return maybeProcess ?? {};
};

const createProcess = (cwd: string, baseProcess: Partial<IProcess> = getGlobalProcess()): IProcess => ({
  cwd: () => cwd,
  platform: baseProcess.platform ?? 'linux',
  emitWarning: baseProcess.emitWarning?.bind(baseProcess) ?? (() => {}),
  env: baseProcess.env ?? {},
  getuid: baseProcess.getuid?.bind(baseProcess),
  getgid: baseProcess.getgid?.bind(baseProcess),
});

// Default volume.
export const vol = Volume.fromNestedJSON({}, '/', { process: createProcess('/') });

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

/** Options for creating a memfs instance. */
export interface MemfsOptions {
  /** Custom working directory for resolving relative paths. Defaults to `'/'`. */
  cwd?: string;
  /** Custom `process`-like object for controlling platform, uid, gid, and cwd behavior. */
  process?: IProcess;
}

/**
 * Creates a new file system instance.
 *
 * @param json File system structure expressed as a JSON object.
 *        Use `null` for empty directories and empty string for empty files.
 * @param cwdOrOpts Current working directory (string) or options object.
 *        The JSON structure will be created relative to the cwd path.
 * @returns A `memfs` file system instance, which is a drop-in replacement for
 *          the `fs` module.
 */
export const memfs = (
  json: NestedDirectoryJSON = {},
  cwdOrOpts: string | MemfsOptions = '/',
): { fs: IFs; vol: Volume } => {
  const opts: MemfsOptions = typeof cwdOrOpts === 'string' ? { cwd: cwdOrOpts } : cwdOrOpts;
  // When no explicit cwd is given but a custom process is provided, let the
  // Superblock use that process's cwd(). Otherwise default to '/' so the
  // convenience function keeps its opinionated virtual-root default.
  const cwd = opts.cwd ?? (opts.process ? undefined : '/');
  const process = cwd === undefined ? opts.process : createProcess(cwd, opts.process);
  const vol = Volume.fromNestedJSON(json, cwd, { process });
  const fs = createFsFromVolume(vol);
  return { fs, vol };
};

export type IFsWithVolume = IFs & { __vol: Volume };

declare let module;
module.exports = { ...module.exports, ...fs };
module.exports.semantic = true;
