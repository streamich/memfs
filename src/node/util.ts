import { ERRSTR } from './constants';
import * as errors from '../internal/errors';
import type { FsCallbackApi } from './types';
import type * as misc from './types/misc';

export function promisify(
  fs: FsCallbackApi,
  fn: string,
  getResult: (result: any) => any = input => input,
): (...args) => Promise<any> {
  return (...args) =>
    new Promise((resolve, reject) => {
      fs[fn].bind(fs)(...args, (error, result) => {
        if (error) return reject(error);
        return resolve(getResult(result));
      });
    });
}

export function validateCallback<T>(callback: T): misc.AssertCallback<T> {
  if (typeof callback !== 'function') throw TypeError(ERRSTR.CB);
  return callback as misc.AssertCallback<T>;
}

function _modeToNumber(mode: misc.TMode | undefined, def?): number | undefined {
  if (typeof mode === 'number') return mode;
  if (typeof mode === 'string') return parseInt(mode, 8);
  if (def) return modeToNumber(def);
  return undefined;
}

export function modeToNumber(mode: misc.TMode | undefined, def?): number {
  const result = _modeToNumber(mode, def);
  if (typeof result !== 'number' || isNaN(result)) throw new TypeError(ERRSTR.MODE_INT);
  return result;
}

export function nullCheck(path, callback?) {
  if (('' + path).indexOf('\u0000') !== -1) {
    const er = new Error('Path must be a string without null bytes');
    (er as any).code = 'ENOENT';
    if (typeof callback !== 'function') throw er;
    process.nextTick(callback, er);
    return false;
  }
  return true;
}

function getPathFromURLPosix(url): string {
  if (url.hostname !== '') {
    throw new errors.TypeError('ERR_INVALID_FILE_URL_HOST', process.platform);
  }
  const pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2) | 0x20;
      if (pathname[n + 1] === '2' && third === 102) {
        throw new errors.TypeError('ERR_INVALID_FILE_URL_PATH', 'must not include encoded / characters');
      }
    }
  }
  return decodeURIComponent(pathname);
}

export function pathToFilename(path: misc.PathLike): string {
  if (typeof path !== 'string' && !Buffer.isBuffer(path)) {
    try {
      if (!(path instanceof require('url').URL)) throw new TypeError(ERRSTR.PATH_STR);
    } catch (err) {
      throw new TypeError(ERRSTR.PATH_STR);
    }

    path = getPathFromURLPosix(path);
  }

  const pathString = String(path);
  nullCheck(pathString);
  // return slash(pathString);
  return pathString;
}

const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EPERM = 'EPERM';
const EPROTO = 'EPROTO';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';
const ENOSYS = 'ENOSYS';
const ERR_FS_EISDIR = 'ERR_FS_EISDIR';

function formatError(errorCode: string, func = '', path = '', path2 = '') {
  let pathFormatted = '';
  if (path) pathFormatted = ` '${path}'`;
  if (path2) pathFormatted += ` -> '${path2}'`;

  switch (errorCode) {
    case ENOENT:
      return `ENOENT: no such file or directory, ${func}${pathFormatted}`;
    case EBADF:
      return `EBADF: bad file descriptor, ${func}${pathFormatted}`;
    case EINVAL:
      return `EINVAL: invalid argument, ${func}${pathFormatted}`;
    case EPERM:
      return `EPERM: operation not permitted, ${func}${pathFormatted}`;
    case EPROTO:
      return `EPROTO: protocol error, ${func}${pathFormatted}`;
    case EEXIST:
      return `EEXIST: file already exists, ${func}${pathFormatted}`;
    case ENOTDIR:
      return `ENOTDIR: not a directory, ${func}${pathFormatted}`;
    case EISDIR:
      return `EISDIR: illegal operation on a directory, ${func}${pathFormatted}`;
    case EACCES:
      return `EACCES: permission denied, ${func}${pathFormatted}`;
    case ENOTEMPTY:
      return `ENOTEMPTY: directory not empty, ${func}${pathFormatted}`;
    case EMFILE:
      return `EMFILE: too many open files, ${func}${pathFormatted}`;
    case ENOSYS:
      return `ENOSYS: function not implemented, ${func}${pathFormatted}`;
    case ERR_FS_EISDIR:
      return `[ERR_FS_EISDIR]: Path is a directory: ${func} returned EISDIR (is a directory) ${path}`;
    default:
      return `${errorCode}: error occurred, ${func}${pathFormatted}`;
  }
}

export function createError(errorCode: string, func = '', path = '', path2 = '', Constructor = Error) {
  const error = new Constructor(formatError(errorCode, func, path, path2));
  (error as any).code = errorCode;

  if (path) {
    (error as any).path = path;
  }

  return error;
}

export function genRndStr6(): string {
  const str = (Math.random() + 1).toString(36).substring(2, 8);
  if (str.length === 6) return str;
  else return genRndStr6();
};
