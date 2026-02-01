import { ERRSTR, FLAGS, TEncodingExtended } from '@jsonjoy.com/fs-node-utils';
import * as errors from '@jsonjoy.com/fs-node-builtins/lib/internal/errors';
import { Buffer, bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { Readable } from '@jsonjoy.com/fs-node-builtins/lib/stream';
import { dataToBuffer, validateFd, StatError } from '@jsonjoy.com/fs-core';
import type { FsCallbackApi } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

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
    queueMicrotask(() => {
      callback(er);
    });
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
  if (pathString === ".") return "./"
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

export function genRndStr6(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}

export function flagsToNumber(flags: misc.TFlags | undefined): number {
  if (typeof flags === 'number') return flags;

  if (typeof flags === 'string') {
    const flagsNum = FLAGS[flags];
    if (typeof flagsNum !== 'undefined') return flagsNum;
  }

  // throw new TypeError(formatError(ERRSTR_FLAG(flags)));
  throw new errors.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
}

export function streamToBuffer(stream: Readable) {
  const chunks: any[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export const bufToUint8 = (buf: Buffer): Uint8Array => new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

export const getWriteArgs = (
  fd: number,
  a?: unknown,
  b?: unknown,
  c?: unknown,
  d?: unknown,
  e?: unknown,
): [
  fd: number,
  dataAsStr: boolean,
  buf: Buffer,
  offset: number,
  length: number,
  position: number | null,
  callback: (...args) => void,
] => {
  validateFd(fd);
  let offset: number = 0;
  let length: number | undefined;
  let position: number | null = null;
  let encoding: BufferEncoding | undefined;
  let callback: ((...args) => void) | undefined;
  const tipa = typeof a;
  const tipb = typeof b;
  const tipc = typeof c;
  const tipd = typeof d;
  if (tipa !== 'string') {
    if (tipb === 'function') {
      callback = <(...args) => void>b;
    } else if (tipc === 'function') {
      offset = (<number>b) | 0;
      callback = <(...args) => void>c;
    } else if (tipd === 'function') {
      offset = (<number>b) | 0;
      length = <number>c;
      callback = <(...args) => void>d;
    } else {
      offset = (<number>b) | 0;
      length = <number>c;
      position = <number | null>d;
      callback = <(...args) => void>e;
    }
  } else {
    if (tipb === 'function') {
      callback = <(...args) => void>b;
    } else if (tipc === 'function') {
      position = <number | null>b;
      callback = <(...args) => void>c;
    } else if (tipd === 'function') {
      position = <number | null>b;
      encoding = <BufferEncoding>c;
      callback = <(...args) => void>d;
    }
  }
  const buf: Buffer = dataToBuffer(<string | Buffer>a, encoding);
  if (tipa !== 'string') {
    if (typeof length === 'undefined') length = buf.length;
  } else {
    offset = 0;
    length = buf.length;
  }
  const cb = validateCallback(callback);
  return [fd, tipa === 'string', buf, offset, length!, position, cb];
};

export const getWriteSyncArgs = (
  fd: number,
  a: string | Buffer | ArrayBufferView | DataView,
  b?: number,
  c?: number | BufferEncoding,
  d?: number | null,
): [fd: number, buf: Buffer, offset: number, length?: number, position?: number | null] => {
  validateFd(fd);
  let encoding: BufferEncoding | undefined;
  let offset: number | undefined;
  let length: number | undefined;
  let position: number | null | undefined;
  const isBuffer = typeof a !== 'string';
  if (isBuffer) {
    offset = (b || 0) | 0;
    length = c as number;
    position = d;
  } else {
    position = b;
    encoding = c as BufferEncoding;
  }
  const buf: Buffer = dataToBuffer(a, encoding);
  if (isBuffer) {
    if (typeof length === 'undefined') {
      length = buf.length;
    }
  } else {
    offset = 0;
    length = buf.length;
  }
  return [fd, buf, offset || 0, length, position];
};

export function bufferToEncoding(buffer: Buffer, encoding?: TEncodingExtended): misc.TDataOut {
  if (!encoding || encoding === 'buffer') return buffer;
  else return buffer.toString(encoding);
}

export function isReadableStream(stream): stream is Readable {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    typeof stream.on === 'function' &&
    stream.readable === true
  );
}
