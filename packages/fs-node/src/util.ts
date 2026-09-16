import { FLAGS, TEncodingExtended } from '@jsonjoy.com/fs-node-utils';
import { invalidArgValue } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import { validateFunction, validateInt32, validateUint32 } from '@jsonjoy.com/fs-node-utils/lib/validators';
import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { Readable } from '@jsonjoy.com/fs-node-builtins/lib/stream';
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
  validateFunction(callback, name);
  return callback as misc.AssertCallback<T>;
}

const OCTAL_REG = /^[0-7]+$/;
const MODE_DESC = 'must be a 32-bit unsigned integer or an octal string';

// TODO: `mkdirSync`/`mkdir` must pass `'options.mode'` when the mode came from an options object;
// Node names it that way (`lib/fs.js:1370`) and `getMkdirOptions` currently erases the distinction.
/** `parseFileMode()` of `lib/internal/validators.js`. */
export function modeToNumber(mode: misc.TMode | undefined, def?, name: string = 'mode'): number {
  let value: unknown = mode ?? def;
  if (typeof value === 'string') {
    if (!OCTAL_REG.test(value)) throw invalidArgValue(name, value, MODE_DESC);
    value = parseInt(value, 8);
  }
  validateUint32(value, name);
  return (value as number) + 0;
}

export function genRndStr6(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}

// TODO: Node takes null and undefined flags as O_RDONLY. Defaulting here would open `appendFile`
// read-only, because `getOptions` copies an explicit `{flag: undefined}` over its default; fix the
// option defaults in `options.ts` first.
/** `stringToFlags()` of `lib/internal/fs/utils.js`. */
export function flagsToNumber(flags: misc.TFlags | undefined): number {
  if (typeof flags === 'number') {
    validateInt32(flags, 'flags');
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

export { getWriteArgs, getWriteSyncArgs } from './readWriteArgs';

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
