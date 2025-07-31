import * as pathModule from 'path';
import { Buffer, bufferFrom } from '../internal/buffer';
import process from '../process';
import { TDataOut, ENCODING_UTF8 } from '../encoding';
import { pathToFilename, isWin, unixify } from '../node/util';
import { ERRSTR } from '../node/constants';
import type { PathLike } from '../node/types/misc';

const resolveCrossPlatform = pathModule.resolve;
const { sep } = pathModule.posix ? pathModule.posix : pathModule;

type TData = TDataOut | ArrayBufferView | DataView; // Data formats users can give us.

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
  return fullPathSansSlash.split(sep);
};

function pathToSteps(path: PathLike): string[] {
  return filenameToSteps(pathToFilename(path));
}

function dataToStr(data: TData, encoding: string = ENCODING_UTF8): string {
  if (Buffer.isBuffer(data)) return data.toString(encoding);
  else if (data instanceof Uint8Array) return bufferFrom(data).toString(encoding);
  else return String(data);
}

export function isFd(path): boolean {
  return path >>> 0 === path;
}

export function validateFd(fd) {
  if (!isFd(fd)) throw TypeError(ERRSTR.FD);
}

export function dataToBuffer(data: TData, encoding: string = ENCODING_UTF8): Buffer {
  if (Buffer.isBuffer(data)) return data;
  else if (data instanceof Uint8Array) return bufferFrom(data);
  else return bufferFrom(String(data), encoding);
}
