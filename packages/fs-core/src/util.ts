import { resolve as pathResolve } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { Buffer, bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import * as errors from '@jsonjoy.com/fs-node-builtins/lib/internal/errors';
import process from './process';
import { ERRSTR, ENCODING_UTF8, pathSep } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

export const isWin = process.platform === 'win32';

const resolveCrossPlatform = pathResolve;

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

export function dataToBuffer(data: misc.TData, encoding: misc.TEncodingExtended = ENCODING_UTF8): Buffer {
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
    queueMicrotask(() => callback(er));
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
  const filepath = decodeURIComponent(pathname);
  // Windows `pathToFileURL` yields `/C:/dir`; on POSIX that is a real absolute path, so only strip there.
  return isWin ? filepath.replace(/^\/([a-zA-Z]:)/, '$1') : filepath;
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
