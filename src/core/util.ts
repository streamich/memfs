import { resolve as pathResolve, sep, posix } from '../vendor/node/path';
import { Buffer, bufferFrom } from '../vendor/node/internal/buffer';
import process from '../process';
import { TDataOut, TEncodingExtended, ENCODING_UTF8 } from '../encoding';
import { ERRSTR } from '../node/constants';

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

type TResolve = (filename: string, base: string) => string;

let resolve: TResolve = (filename, base) => resolveCrossPlatform(base, filename);
if (isWin) {
  const _resolve = resolve;
  resolve = (filename, base) => unixify(_resolve(filename, base));
}

export { resolve };

export const filenameToSteps = (filename: string, base: string = process.cwd()): string[] => {
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
