import { resolve as pathResolve } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { Buffer, bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import process from './process';
import { ENCODING_UTF8, pathSep } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';
import {
  invalidArgType,
  invalidArgValue,
  invalidUrlScheme,
  outOfRange,
  withCode,
} from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import { INT32_MAX } from '@jsonjoy.com/fs-node-utils/lib/validators';

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
  if (typeof fd !== 'number') throw invalidArgType('fd', 'of type number', fd, true);
  if ((fd < 0 || fd > INT32_MAX) && fd !== Infinity && fd !== -Infinity)
    throw outOfRange('fd', '>= 0 && <= ' + INT32_MAX, fd, true);
  if (!Number.isInteger(fd)) throw outOfRange('fd', 'an integer', fd, true);
}

export function dataToBuffer(data: misc.TData, encoding: misc.TEncodingExtended = ENCODING_UTF8): Buffer {
  if (Buffer.isBuffer(data)) return data;
  else if (data instanceof Uint8Array) return bufferFrom(data);
  else if (encoding === 'buffer') return bufferFrom(String(data), 'utf8');
  else return bufferFrom(String(data), encoding);
}

const NO_NULL_BYTES = 'must be a string, Uint8Array, or URL without null bytes';

/** @param received What Node inspects in the message, the original argument. */
const checkNullByte = (path: string, name: string, received: unknown): void => {
  if (path.indexOf('\u0000') === -1) return;
  throw invalidArgValue(name, received, NO_NULL_BYTES);
};

/**
 * Node `lib/internal/fs/utils.js` `validatePath`: throws synchronously, callback forms included.
 *
 * @param name The Node parameter name the value came in as, for the message.
 */
export function nullCheck(path, name: string = 'path'): boolean {
  if (path instanceof Uint8Array) {
    for (let i = 0; i < path.length; i++) if (!path[i]) throw invalidArgValue(name, path, NO_NULL_BYTES);
    return true;
  }
  const str = '' + path;
  checkNullByte(str, name, str);
  return true;
}

const isURL = (value: any): value is URL =>
  !!value && !!value.href && !!value.protocol && value.auth === undefined && value.path === undefined;

/** Node `lib/internal/url.js` `fileURLToPath`. */
const getPathFromURL = (url: URL): string => {
  if (url.protocol !== 'file:') throw invalidUrlScheme('file');
  if (url.hostname !== '')
    throw withCode(
      new TypeError('File URL host must be "localhost" or empty on ' + process.platform),
      'ERR_INVALID_FILE_URL_HOST',
    );
  const pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2)! | 0x20;
      if (pathname[n + 1] === '2' && third === 102)
        throw withCode(
          new TypeError('File URL path must not include encoded / characters'),
          'ERR_INVALID_FILE_URL_PATH',
        );
    }
  }
  const filepath = decodeURIComponent(pathname);
  // Windows `pathToFileURL` yields `/C:/dir`; on POSIX that is a real absolute path, so only strip there.
  return isWin ? filepath.replace(/^\/([a-zA-Z]:)/, '$1') : filepath;
};

/** @param name The Node parameter name the value came in as, for the message. */
export function pathToFilename(path: misc.PathLike, name: string = 'path'): string {
  const received = path;
  if (path instanceof Uint8Array) path = bufferFrom(path);
  if (typeof path !== 'string' && !Buffer.isBuffer(path)) {
    if (!isURL(path)) throw invalidArgType(name, 'of type string or an instance of Buffer or URL', path);
    path = getPathFromURL(path);
  }
  const pathString = String(path);
  checkNullByte(pathString, name, received instanceof Uint8Array ? received : pathString);
  return pathString;
}
