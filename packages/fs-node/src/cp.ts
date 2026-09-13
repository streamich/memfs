import { posix } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { constants, pathDirname, pathJoin } from '@jsonjoy.com/fs-node-utils';
import { createError, ERROR_CODE, SystemError, type ErrnoException, type Superblock } from '@jsonjoy.com/fs-core';
import { withCode, withNativeCode } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import {
  validateBoolean,
  validateFunction,
  validateInteger,
  validateObject,
} from '@jsonjoy.com/fs-node-utils/lib/validators';
import type Stats from './Stats';
import type { Volume } from './volume';
import type * as opts from '@jsonjoy.com/fs-node-utils/lib/types/options';

const pathResolve = posix.resolve;
const { O_RDONLY, O_WRONLY, O_CREAT, O_EXCL, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE } = constants;

/** Linux errno numbers. */
const enum ERRNO {
  EEXIST = 17,
  ENOTDIR = 20,
  EISDIR = 21,
  EINVAL = 22,
}

const PREFIX: Record<string, string> = {
  ERR_FS_CP_DIR_TO_NON_DIR: 'Cannot overwrite non-directory with directory',
  ERR_FS_CP_EEXIST: 'Target already exists',
  ERR_FS_CP_EINVAL: 'Invalid src or dest',
  ERR_FS_CP_FIFO_PIPE: 'Cannot copy a FIFO pipe',
  ERR_FS_CP_NON_DIR_TO_DIR: 'Cannot overwrite directory with non-directory',
  ERR_FS_CP_SOCKET: 'Cannot copy a socket file',
  ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY: 'Cannot overwrite symlink in subdirectory of self',
  ERR_FS_CP_UNKNOWN: 'Cannot copy an unknown file type',
  ERR_FS_EISDIR: 'Path is a directory',
};

const cpSystemError = (code: string, message: string, path: string, errno: ERRNO, uv: string): SystemError =>
  new SystemError(code, PREFIX[code], { code: uv, message, path, syscall: 'cp', errno });
const cpCodeError = (code: string, message: string): Error => withNativeCode(new Error(message), code);
const invalidFilterReturn = (value: unknown): TypeError =>
  withCode(
    new TypeError('Expected boolean to be returned from the "filter" function but got an instance of Promise.'),
    'ERR_INVALID_RETURN_VALUE',
  );
const asCopyfileError = (error: any, src: string, dest: string): any =>
  error && typeof error.code === 'string' && typeof error.syscall === 'string'
    ? createError(error.code, 'copyfile', src, dest)
    : error;

/** `internal/fs/utils.js` `getValidMode(mode, 'copyFile')`. */
const getValidCpMode = (mode: unknown): number => {
  if (mode === null || mode === undefined) return 0;
  validateInteger(mode, 'mode', 0, 7);
  return mode as number;
};

/** `GetValidFileMode(env, input, UV_FS_COPYFILE)` in `src/util.cc`. */
export const getValidCopyFileMode = (mode: unknown): number => {
  if (mode === null || mode === undefined) return 0;
  if (typeof mode !== 'number')
    throw withNativeCode(new TypeError('mode must be int32 or null/undefined'), 'ERR_INVALID_ARG_TYPE');
  if (!Number.isFinite(mode)) throw withNativeCode(new RangeError('mode is out of range'), 'ERR_OUT_OF_RANGE');
  const truncated = Math.trunc(mode);
  if (truncated < 0 || truncated > 7)
    throw withNativeCode(new RangeError('mode is out of range: >= 0 && <= 7'), 'ERR_OUT_OF_RANGE');
  return truncated;
};

export interface ICpOptionsResolved {
  dereference: boolean;
  errorOnExist: boolean;
  filter?: (src: any, dest: any) => any;
  force: boolean;
  mode: number;
  preserveTimestamps: boolean;
  recursive: boolean;
  verbatimSymlinks: boolean;
}

const CP_DEFAULTS: ICpOptionsResolved = {
  dereference: false,
  errorOnExist: false,
  filter: undefined,
  force: true,
  mode: 0,
  preserveTimestamps: false,
  recursive: false,
  verbatimSymlinks: false,
};

/** `internal/fs/utils.js` `validateCpOptions`. */
export const getCpOptions = (options: opts.ICpOptions | undefined | null): ICpOptionsResolved => {
  if (options === undefined) return { ...CP_DEFAULTS };
  validateObject(options, 'options');
  const resolved: ICpOptionsResolved = { ...CP_DEFAULTS, ...options } as ICpOptionsResolved;
  validateBoolean(resolved.dereference, 'options.dereference');
  validateBoolean(resolved.errorOnExist, 'options.errorOnExist');
  validateBoolean(resolved.force, 'options.force');
  validateBoolean(resolved.preserveTimestamps, 'options.preserveTimestamps');
  validateBoolean(resolved.recursive, 'options.recursive');
  validateBoolean(resolved.verbatimSymlinks, 'options.verbatimSymlinks');
  resolved.mode = getValidCpMode((options as opts.ICpOptions).mode);
  if (resolved.dereference === true && resolved.verbatimSymlinks === true)
    throw withCode(
      new TypeError('Option "dereference" cannot be used in combination with option "verbatimSymlinks"'),
      'ERR_INCOMPATIBLE_OPTION_PAIR',
    );
  if (resolved.filter !== undefined) validateFunction(resolved.filter, 'options.filter');
  return resolved;
};

// TODO: Node's `util/types` `isPromise` takes only a native Promise, so a
// non-Promise thenable is copied there but throws here.
const isPromise = (value: unknown): boolean =>
  !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as any).then === 'function';

/** `uv__fs_copyfile` */
export const copyFileCore = (core: Superblock, src: string, dest: string, flags: number): void => {
  let srcFd = -1;
  let destFd = -1;
  let copied = false;
  try {
    srcFd = core.open(src, O_RDONLY, 0);
    const srcNode = core.getFileByFdOrThrow(srcFd, 'copyfile').node;
    const srcMode = srcNode.mode;
    const excl = !!(flags & COPYFILE_EXCL);
    destFd = core.open(dest, excl ? O_WRONLY | O_CREAT | O_EXCL : O_WRONLY | O_CREAT, 0o666);
    const destNode = core.getFileByFdOrThrow(destFd, 'copyfile').node;
    if (!excl) {
      if (destNode === srcNode) {
        copied = true;
        return;
      }
      core.ftruncate(destFd, 0);
    }
    core.fchmod(destFd, srcMode);
    if (flags & COPYFILE_FICLONE_FORCE) throw createError(ERROR_CODE.ENOSYS, 'copyfile', src, dest);
    if (srcNode.isDirectory()) throw createError(ERROR_CODE.EISDIR, 'copyfile', src, dest);
    const size = srcNode.getSize();
    if (size > 0) core.write(destFd, srcNode.getBuffer(), 0, size, 0);
    copied = true;
  } catch (error) {
    throw asCopyfileError(error, src, dest);
  } finally {
    if (srcFd >= 0) core.close(srcFd);
    if (destFd >= 0) {
      core.close(destFd);
      if (!copied)
        try {
          core.unlink(dest);
        } catch {}
    }
  }
};

const toParts = (path: string): string[] => {
  const raw = pathResolve(path).split('/');
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i++) if (raw[i]) parts.push(raw[i]);
  return parts;
};

const isSrcSubdir = (src: string, dest: string): boolean => {
  const srcArr = toParts(src);
  const destArr = toParts(dest);
  const length = srcArr.length;
  if (length > destArr.length) return false;
  for (let i = 0; i < length; i++) if (destArr[i] !== srcArr[i]) return false;
  return true;
};

const areIdentical = (srcStat: Stats, destStat: Stats): boolean =>
  srcStat.ino === destStat.ino && srcStat.dev === destStat.dev;

const statOf = (vol: Volume, path: string, dereference: boolean): Stats =>
  (dereference ? vol.statSync(path) : vol.lstatSync(path)) as Stats;

const statOrNull = (vol: Volume, path: string, dereference: boolean): Stats | undefined =>
  (dereference ? vol.statSync(path, { throwIfNoEntry: false }) : vol.lstatSync(path, { throwIfNoEntry: false })) as
    | Stats
    | undefined;

const readEntries = (vol: Volume, dir: string): string[] => {
  try {
    return vol.readdirSync(dir) as string[];
  } catch (error) {
    const code = (error as ErrnoException).code;
    throw code ? createError(code, 'opendir', dir) : error;
  }
};

const isDirectory = (vol: Volume, path: string): boolean => {
  const stats = vol.statSync(path, { throwIfNoEntry: false }) as Stats | undefined;
  return !!stats && stats.isDirectory();
};

const setDestMode = (vol: Volume, dest: string, srcMode: number | bigint): void => {
  vol.chmodSync(dest, Number(srcMode));
};

const setDestTimestamps = (vol: Volume, src: string, dest: string): void => {
  const updated = vol.statSync(src) as Stats;
  vol.utimesSync(dest, updated.atime, updated.mtime);
};

const resolveLinkTarget = (vol: Volume, src: string, verbatimSymlinks: boolean): string => {
  const target = String(vol.readlinkSync(src));
  return !verbatimSymlinks && target[0] !== '/' ? pathResolve(pathDirname(src), target) : target;
};

/** `std::filesystem::equivalent` */
const identicalPaths = (vol: Volume, a: string, b: string): boolean => {
  try {
    const statA = vol.statSync(a, { throwIfNoEntry: false }) as Stats | undefined;
    if (!statA) return false;
    const statB = vol.statSync(b, { throwIfNoEntry: false }) as Stats | undefined;
    return !!statB && areIdentical(statA, statB);
  } catch {
    return false;
  }
};

/** `CpSyncCheckPaths` in `src/node_file.cc`. */
const checkPathsSync = (vol: Volume, src: string, dest: string, dereference: boolean, recursive: boolean): void => {
  let srcStat: Stats;
  // TODO: memfs `statSync` ignores a trailing separator, so a file src spelled `a.txt/` gets here
  // instead of failing ENOTDIR; drop this note once `walk` rejects it (maybe already done?).
  try {
    srcStat = statOf(vol, src, !dereference);
  } catch (error) {
    const code = (error as ErrnoException).code;
    throw code ? createError(code, dereference ? 'stat' : 'lstat', src) : error;
  }
  let destStat: Stats | undefined;
  try {
    destStat = statOf(vol, dest, dereference);
  } catch {}
  const srcIsDir = srcStat.isDirectory() || (dereference && srcStat.isSymbolicLink());
  const srcPath = pathResolve(src);
  const destPath = pathResolve(dest);
  if (destStat) {
    if (identicalPaths(vol, srcPath, destPath))
      throw cpCodeError('ERR_FS_CP_EINVAL', 'src and dest cannot be the same ' + destPath);
    const destIsDir = destStat.isDirectory();
    if (srcIsDir && !destIsDir)
      throw cpCodeError(
        'ERR_FS_CP_DIR_TO_NON_DIR',
        'Cannot overwrite non-directory ' + destPath + ' with directory ' + srcPath,
      );
    if (!srcIsDir && destIsDir)
      throw cpCodeError(
        'ERR_FS_CP_NON_DIR_TO_DIR',
        'Cannot overwrite directory ' + destPath + ' with non-directory ' + srcPath,
      );
  }
  const srcPrefix = srcPath + '/';
  if (srcIsDir && destPath.startsWith(srcPrefix))
    throw cpCodeError('ERR_FS_CP_EINVAL', 'Cannot copy ' + srcPrefix + ' to a subdirectory of self ' + destPath);
  const destParent = pathDirname(destPath);
  if (pathDirname(srcPath) !== destParent && destParent !== '/' && identicalPaths(vol, srcPath, destParent))
    throw cpCodeError('ERR_FS_CP_EINVAL', 'Cannot copy ' + srcPrefix + ' to a subdirectory of self ' + destPath);
  if (srcIsDir && !recursive)
    throw cpCodeError('ERR_FS_EISDIR', 'Recursive option not enabled, cannot copy a directory: ' + srcPrefix);
  if (srcStat.isSocket()) throw cpCodeError('ERR_FS_CP_SOCKET', 'Cannot copy a socket file: ' + destPath);
  if (srcStat.isFIFO()) throw cpCodeError('ERR_FS_CP_FIFO_PIPE', 'Cannot copy a FIFO pipe: ' + destPath);
  try {
    if (!destStat || !vol.existsSync(destParent)) vol.mkdirSync(destParent, { recursive: true });
  } catch {}
};

const filterSync = (filter: (src: any, dest: any) => any, src: string, dest: string): boolean => {
  const shouldCopy = filter(src, dest);
  if (isPromise(shouldCopy)) throw invalidFilterReturn(shouldCopy);
  return !!shouldCopy;
};

export const cpSync = (vol: Volume, src: string, dest: string, options: ICpOptionsResolved): void => {
  const filter = options.filter;
  if (filter && !filterSync(filter, src, dest)) return;
  checkPathsSync(vol, src, dest, options.dereference, options.recursive);
  getStatsSync(vol, src, dest, options);
};

const getStatsSync = (vol: Volume, src: string, dest: string, options: ICpOptionsResolved): void => {
  const dereference = options.dereference;
  const srcStat = statOf(vol, src, dereference);
  const destStat = statOrNull(vol, dest, dereference);
  if (srcStat.isDirectory() && options.recursive) return onDirSync(srcStat, destStat, vol, src, dest, options);
  if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
    return onFileSync(srcStat, destStat, vol, src, dest, options);
  if (srcStat.isSymbolicLink()) return onLinkSync(destStat, vol, src, dest, options.verbatimSymlinks);
};

const onFileSync = (
  srcStat: Stats,
  destStat: Stats | undefined,
  vol: Volume,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): void => {
  if (destStat) {
    if (options.force) vol.unlinkSync(dest);
    else if (options.errorOnExist)
      throw cpSystemError('ERR_FS_CP_EEXIST', dest + ' already exists', dest, ERRNO.EEXIST, 'EEXIST');
    else return;
  }
  copyFileCore(vol._core, src, dest, options.mode);
  const srcMode = Number(srcStat.mode);
  // TODO: Node chmods after utimes - restore that order once memfs `Node.chmod` stops moving mtime.
  setDestMode(vol, dest, srcMode);
  if (options.preserveTimestamps) setDestTimestamps(vol, src, dest);
};

const onDirSync = (
  srcStat: Stats,
  destStat: Stats | undefined,
  vol: Volume,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): void => {
  if (!destStat) copyDirSync(vol, src, dest, options, true, Number(srcStat.mode));
  else copyDirSync(vol, src, dest, options, false, undefined);
};

// TODO: split the two paths once a TCK entry tells them apart. Without a filter Node hands the whole subtree to
// `cpSyncCopyDir` (`node_file.cc`), which recreates every symlink whatever `dereference` says, never chmods a
// directory it made and reports its failures as `cp` - this JS loop, the one Node runs with a filter, serves both.
const copyDirSync = (
  vol: Volume,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
  mkDir: boolean,
  srcMode: number | undefined,
): void => {
  if (mkDir) vol.mkdirSync(dest);
  try {
    const entries = readEntries(vol, src);
    const filter = options.filter;
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      const srcItem = pathJoin(src, name);
      const destItem = pathJoin(dest, name);
      if (filter && !filterSync(filter, srcItem, destItem)) continue;
      getStatsSync(vol, srcItem, destItem, options);
    }
  } finally {
    if (srcMode !== undefined) setDestMode(vol, dest, srcMode);
  }
};

const onLinkSync = (
  destStat: Stats | undefined,
  vol: Volume,
  src: string,
  dest: string,
  verbatimSymlinks: boolean,
): void => {
  const resolvedSrc = resolveLinkTarget(vol, src, verbatimSymlinks);
  if (!destStat) {
    vol.symlinkSync(resolvedSrc, dest);
    return;
  }
  let resolvedDest: string;
  try {
    resolvedDest = String(vol.readlinkSync(dest));
  } catch (error) {
    if ((error as ErrnoException).code === 'EINVAL') {
      vol.symlinkSync(resolvedSrc, dest);
      return;
    }
    throw error;
  }
  if (resolvedDest[0] !== '/') resolvedDest = pathResolve(pathDirname(dest), resolvedDest);
  if (isDirectory(vol, src) && isSrcSubdir(resolvedSrc, resolvedDest))
    throw cpCodeError('ERR_FS_CP_EINVAL', 'Cannot copy ' + resolvedSrc + ' to a subdirectory of self ' + resolvedDest);
  if (isDirectory(vol, dest) && isSrcSubdir(resolvedDest, resolvedSrc))
    throw cpCodeError('ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY', 'cannot overwrite ' + resolvedDest + ' with ' + resolvedSrc);
  vol.unlinkSync(dest);
  vol.symlinkSync(resolvedSrc, dest);
};

/** `internal/fs/cp/cp.js` `cpFn`. */
export const cpAsync = async (vol: Volume, src: string, dest: string, options: ICpOptionsResolved): Promise<void> => {
  const stats = await checkPaths(vol, src, dest, options);
  if (!stats) return;
  checkParentPaths(vol, src, stats.srcStat, dest);
  const destParent = pathDirname(dest);
  if (!vol.existsSync(destParent)) vol.mkdirSync(destParent, { recursive: true });
  await getStatsForCopy(vol, stats.destStat, src, dest, options);
};

interface CheckedPaths {
  srcStat: Stats;
  destStat: Stats | undefined;
}

const checkPaths = async (
  vol: Volume,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): Promise<CheckedPaths | undefined> => {
  const filter = options.filter;
  if (filter && !(await filter(src, dest))) return undefined;
  const dereference = options.dereference;
  const srcStat = statOf(vol, src, dereference);
  const destStat = statOrNull(vol, dest, dereference);
  if (destStat) {
    if (areIdentical(srcStat, destStat))
      throw cpSystemError('ERR_FS_CP_EINVAL', 'src and dest cannot be the same', dest, ERRNO.EINVAL, 'EINVAL');
    if (srcStat.isDirectory() && !destStat.isDirectory())
      throw cpSystemError(
        'ERR_FS_CP_DIR_TO_NON_DIR',
        'cannot overwrite non-directory ' + dest + ' with directory ' + src,
        dest,
        ERRNO.EISDIR,
        'EISDIR',
      );
    if (!srcStat.isDirectory() && destStat.isDirectory())
      throw cpSystemError(
        'ERR_FS_CP_NON_DIR_TO_DIR',
        'cannot overwrite directory ' + dest + ' with non-directory ' + src,
        dest,
        ERRNO.ENOTDIR,
        'ENOTDIR',
      );
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest))
    throw cpSystemError(
      'ERR_FS_CP_EINVAL',
      'cannot copy ' + src + ' to a subdirectory of self ' + dest,
      dest,
      ERRNO.EINVAL,
      'EINVAL',
    );
  return { srcStat, destStat };
};

/** Walks up from the dest parent, stopping at the src parent or the root. */
const checkParentPaths = (vol: Volume, src: string, srcStat: Stats, dest: string): void => {
  const srcParent = pathResolve(pathDirname(src));
  let destParent = pathResolve(pathDirname(dest));
  for (;;) {
    if (destParent === srcParent || destParent === '/') return;
    const destStat = vol.statSync(destParent, { throwIfNoEntry: false }) as Stats | undefined;
    if (!destStat) return;
    if (areIdentical(srcStat, destStat))
      throw cpSystemError(
        'ERR_FS_CP_EINVAL',
        'cannot copy ' + src + ' to a subdirectory of self ' + dest,
        dest,
        ERRNO.EINVAL,
        'EINVAL',
      );
    destParent = pathResolve(pathDirname(destParent));
  }
};

const getStatsForCopy = async (
  vol: Volume,
  destStat: Stats | undefined,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): Promise<void> => {
  const srcStat = statOf(vol, src, options.dereference);
  if (srcStat.isDirectory() && options.recursive) return onDir(vol, srcStat, destStat, src, dest, options);
  if (srcStat.isDirectory())
    throw cpSystemError('ERR_FS_EISDIR', src + ' is a directory (not copied)', src, ERRNO.EISDIR, 'EISDIR');
  if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
    return onFile(vol, srcStat, destStat, src, dest, options);
  if (srcStat.isSymbolicLink()) return onLink(vol, destStat, src, dest, options);
  if (srcStat.isSocket())
    throw cpSystemError('ERR_FS_CP_SOCKET', 'cannot copy a socket file: ' + dest, dest, ERRNO.EINVAL, 'EINVAL');
  if (srcStat.isFIFO())
    throw cpSystemError('ERR_FS_CP_FIFO_PIPE', 'cannot copy a FIFO pipe: ' + dest, dest, ERRNO.EINVAL, 'EINVAL');
  throw cpSystemError('ERR_FS_CP_UNKNOWN', 'cannot copy an unknown file type: ' + dest, dest, ERRNO.EINVAL, 'EINVAL');
};

const onFile = async (
  vol: Volume,
  srcStat: Stats,
  destStat: Stats | undefined,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): Promise<void> => {
  if (destStat) {
    if (options.force) vol.unlinkSync(dest);
    else if (options.errorOnExist)
      throw cpSystemError('ERR_FS_CP_EEXIST', dest + ' already exists', dest, ERRNO.EEXIST, 'EEXIST');
    else return;
  }
  copyFileCore(vol._core, src, dest, options.mode);
  const srcMode = Number(srcStat.mode);
  // TODO: Node chmods after utimes - restore that order once memfs `Node.chmod` stops moving mtime.
  setDestMode(vol, dest, srcMode);
  if (options.preserveTimestamps) setDestTimestamps(vol, src, dest);
};

const onDir = async (
  vol: Volume,
  srcStat: Stats,
  destStat: Stats | undefined,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): Promise<void> => {
  if (!destStat) {
    vol.mkdirSync(dest);
    await copyDir(vol, src, dest, options);
    setDestMode(vol, dest, Number(srcStat.mode));
    return;
  }
  if (options.errorOnExist && !options.force)
    throw cpSystemError('ERR_FS_CP_EEXIST', dest + ' already exists', dest, ERRNO.EEXIST, 'EEXIST');
  await copyDir(vol, src, dest, options);
};

const copyDir = async (vol: Volume, src: string, dest: string, options: ICpOptionsResolved): Promise<void> => {
  const entries = readEntries(vol, src);
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i];
    const srcItem = pathJoin(src, name);
    const destItem = pathJoin(dest, name);
    const checked = await checkPaths(vol, srcItem, destItem, options);
    if (checked) await getStatsForCopy(vol, checked.destStat, srcItem, destItem, options);
  }
};

const onLink = async (
  vol: Volume,
  destStat: Stats | undefined,
  src: string,
  dest: string,
  options: ICpOptionsResolved,
): Promise<void> => {
  const resolvedSrc = resolveLinkTarget(vol, src, options.verbatimSymlinks);
  if (!destStat) {
    vol.symlinkSync(resolvedSrc, dest);
    return;
  }
  let resolvedDest: string;
  try {
    resolvedDest = String(vol.readlinkSync(dest));
  } catch (error) {
    if ((error as ErrnoException).code === 'EINVAL') {
      vol.symlinkSync(resolvedSrc, dest);
      return;
    }
    throw error;
  }
  if (resolvedDest[0] !== '/') resolvedDest = pathResolve(pathDirname(dest), resolvedDest);
  if (isDirectory(vol, src) && isSrcSubdir(resolvedSrc, resolvedDest))
    throw cpSystemError(
      'ERR_FS_CP_EINVAL',
      'cannot copy ' + resolvedSrc + ' to a subdirectory of self ' + resolvedDest,
      dest,
      ERRNO.EINVAL,
      'EINVAL',
    );
  if ((statOf(vol, src, true) as Stats).isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc))
    throw cpSystemError(
      'ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY',
      'cannot overwrite ' + resolvedDest + ' with ' + resolvedSrc,
      dest,
      ERRNO.EINVAL,
      'EINVAL',
    );
  vol.unlinkSync(dest);
  vol.symlinkSync(resolvedSrc, dest);
};
