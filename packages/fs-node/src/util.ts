import { FLAGS, TEncodingExtended } from '@jsonjoy.com/fs-node-utils';
import { invalidArgType, invalidArgValue, outOfRange } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { Readable } from '@jsonjoy.com/fs-node-builtins/lib/stream';
import { dataToBuffer, validateFd } from '@jsonjoy.com/fs-core';
import type { FsCallbackApi } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

export { nullCheck, pathToFilename, createError, createStatError, createWatchError } from '@jsonjoy.com/fs-core';

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

/**
 * @todo `Dir.ts` must call this as `validateCallback(callback, 'callback')`. Node names the argument
 *     `callback` on `fs.Dir` (`lib/internal/fs/dir.js`) and `cb` everywhere else.
 * 
 * @param name The name Node gives this callback, which is per call site, not per function
 */
export function validateCallback<T>(callback: T, name: string = 'cb'): misc.AssertCallback<T> {
  if (typeof callback !== 'function') throw invalidArgType(name, 'of type function', callback);
  return callback as misc.AssertCallback<T>;
}

const OCTAL_REG = /^[0-7]+$/;
const MODE_DESC = 'must be a 32-bit unsigned integer or an octal string';
const UINT32_MAX = 4294967295;

// TODO: `mkdirSync`/`mkdir` must pass `'options.mode'` when the mode came from an options object;
// Node names it that way (`lib/fs.js:1370`) and `getMkdirOptions` currently erases the distinction.
/** `parseFileMode()` of `lib/internal/validators.js`. */
export function modeToNumber(mode: misc.TMode | undefined, def?, name: string = 'mode'): number {
  let value: unknown = mode ?? def;
  if (typeof value === 'string') {
    if (!OCTAL_REG.test(value)) throw invalidArgValue(name, value, MODE_DESC);
    value = parseInt(value, 8);
  }
  if (typeof value !== 'number') throw invalidArgType(name, 'of type number', value);
  if (!Number.isInteger(value)) throw outOfRange(name, 'an integer', value);
  if (value < 0 || value > UINT32_MAX) throw outOfRange(name, '>= 0 && <= ' + UINT32_MAX, value);
  return value + 0;
}

export function genRndStr6(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

// TODO: Node takes null and undefined flags as O_RDONLY. Defaulting here would open `appendFile`
// read-only, because `getOptions` copies an explicit `{flag: undefined}` over its default; fix the
// option defaults in `options.ts` first.
/** `stringToFlags()` of `lib/internal/fs/utils.js`. */
export function flagsToNumber(flags: misc.TFlags | undefined): number {
  if (typeof flags === 'number') {
    if (!Number.isInteger(flags)) throw outOfRange('flags', 'an integer', flags);
    if (flags < INT32_MIN || flags > INT32_MAX)
      throw outOfRange('flags', '>= ' + INT32_MIN + ' && <= ' + INT32_MAX, flags);
    return flags;
  }
  if (typeof flags === 'string') {
    const flagsNum = FLAGS[flags];
    if (typeof flagsNum !== 'undefined') return flagsNum;
  }
  throw invalidArgValue('flags', flags);
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
