import { ERRSTR, FLAGS, TEncodingExtended } from '@jsonjoy.com/fs-node-utils';
import * as errors from '@jsonjoy.com/fs-node-builtins/lib/internal/errors';
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
