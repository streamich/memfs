import { resolve as pathResolve, sep, posix } from '@jsonjoy.com/node-fs-dependencies/lib/path';
import { Buffer, bufferFrom } from '@jsonjoy.com/node-fs-dependencies/lib/internal/buffer';
import * as errors from '@jsonjoy.com/node-fs-dependencies/lib/internal/errors';
import process from './process';
import { TDataOut, TEncodingExtended, ENCODING_UTF8 } from './encoding';
import { ERRSTR } from '@jsonjoy.com/node-fs-utils';
import type * as misc from '@jsonjoy.com/node-fs-utils/lib/types/misc';
import type { StatError } from './types';

export const isWin = process.platform === 'win32';

const resolveCrossPlatform = pathResolve;
const pathSep = posix ? posix.sep : sep;

type TData = TDataOut | ArrayBufferView | DataView; // Data formats users can give us.

const isSeparator = (str, i) => {
  let char = str[i];
  return i > 0 && (char === '/' || (isWin && char === '\\'));
};

const removeTrailingSeparator = (str: string): string => {
  let i = str.length - 1;
  if (i < 2) return str;
  while (isSeparator(str, i)) i--;
  return str.substr(0, i + 1);
};

const normalizePath = (str, stripTrailing): string => {
  if (typeof str !== 'string') throw new TypeError('expected a string');
  str = str.replace(/[\\\/]+/g, '/');
  if (stripTrailing !== false) str = removeTrailingSeparator(str);
  return str;
};

export const unixify = (filepath: string, stripTrailing: boolean = true): string => {
  if (isWin) {
    filepath = normalizePath(filepath, stripTrailing);
    return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
  }
  return filepath;
};

type TResolve = (filename: string, base?: string) => string;

let resolve: TResolve = (filename, base = process.cwd()) => resolveCrossPlatform(base, filename);
if (isWin) {
  const _resolve = resolve;
  resolve = (filename, base) => unixify(_resolve(filename, base));
}

export { resolve };

export const filenameToSteps = (filename: string, base?: string): string[] => {
  const fullPath = resolve(filename, base);
  const fullPathSansSlash = fullPath.substring(1);
  if (!fullPathSansSlash) return [];
  return fullPathSansSlash.split(pathSep);
};

export function isFd(path): boolean {
  return path >>> 0 === path;
}

export function validateFd(fd) {
  if (!isFd(fd)) throw TypeError(ERRSTR.FD);
}

export function dataToBuffer(data: TData, encoding: TEncodingExtended = ENCODING_UTF8): Buffer {
  if (Buffer.isBuffer(data)) return data;
  else if (data instanceof Uint8Array) return bufferFrom(data);
  else if (encoding === 'buffer') return bufferFrom(String(data), 'utf8');
  else return bufferFrom(String(data), encoding);
}

export function nullCheck(path, callback?) {
  if (('' + path).indexOf('\u0000') !== -1) {
    const er = new Error('Path must be a string without null bytes');
    (er as any).code = 'ENOENT';
    if (typeof callback !== 'function') throw er;
    Promise.resolve().then(() => callback(er));
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
  if (path instanceof Uint8Array) {
    path = bufferFrom(path);
  }
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
const ERR_OUT_OF_RANGE = 'ERR_OUT_OF_RANGE';

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
    case ERR_OUT_OF_RANGE:
      return `[ERR_OUT_OF_RANGE]: value out of range, ${func}${pathFormatted}`;
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

export function createStatError(errorCode: string, func = '', path = '', path2 = ''): StatError {
  return {
    code: errorCode,
    message: formatError(errorCode, func, path, path2),
    path,
    toError() {
      const error = new Error(this.message);
      (error as any).code = this.code;
      if (this.path) {
        (error as any).path = this.path;
      }
      return error;
    },
  } as StatError;
}
