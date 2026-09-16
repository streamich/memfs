import { Buffer, bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { validateFd } from '@jsonjoy.com/fs-core';
import { invalidArgType, invalidArgValue, outOfRange } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import {
  ValidateObject,
  validateBuffer,
  validateFunction,
  validateInt32,
  validateInteger,
  validateObject,
} from '@jsonjoy.com/fs-node-utils/lib/validators';

/**
 * Argument dispatch for `read`, `readv`, `write` and `writev` in every form: positional, options
 * object, params object, `FileHandle` and callback. Node's own dispatch lives in `lib/fs.js`
 * (`read`, `readSync`, `write`, `writeSync`, `readv`, `writev`) and `lib/internal/fs/promises.js`
 * (`read`, `write`); the validators it calls live in `lib/internal/fs/utils.js` and
 * `lib/internal/validators.js`. This module mirrors them, so a caller only ever sees one
 * normalized shape.
 */

const READ_BUFFER_SIZE = 16384;

const validateOptions = (value: unknown, name: string): void =>
  validateObject(value, name, ValidateObject.AllowNullable);

const validatePosition = (position: unknown, name: string, length: number): void => {
  if (typeof position === 'number') validateInteger(position, name, -1);
  else if (typeof position === 'bigint') {
    const max = 2n ** 63n - 1n - BigInt(length);
    if (!(position >= -1n && position <= max)) throw outOfRange(name, '>= -1 && <= ' + max, position);
  } else throw invalidArgType(name, 'of type bigint or integer', position);
};

const validateBufferArray = (buffers: unknown, name: string = 'buffers'): void => {
  if (!Array.isArray(buffers)) throw invalidArgType(name, 'an ArrayBufferView[]', buffers);
  const length = buffers.length;
  for (let i = 0; i < length; i++)
    if (!ArrayBuffer.isView(buffers[i])) throw invalidArgType(name, 'an ArrayBufferView[]', buffers);
};

const validateOffsetLengthRead = (offset: number, length: number, bufferLength: number): void => {
  if (offset < 0) throw outOfRange('offset', '>= 0', offset);
  if (length < 0) throw outOfRange('length', '>= 0', length);
  if (offset + length > bufferLength) throw outOfRange('length', '<= ' + (bufferLength - offset), length);
};

const validateOffsetLengthWrite = (offset: number, length: number, byteLength: number): void => {
  if (offset > byteLength) throw outOfRange('offset', '<= ' + byteLength, offset);
  if (length > byteLength - offset) throw outOfRange('length', '<= ' + (byteLength - offset), length);
  if (length < 0) throw outOfRange('length', '>= 0', length);
  validateInt32(length, 'length', 0);
};

const validateStringAfterArrayBufferView = (buffer: unknown, name: string): void => {
  if (typeof buffer !== 'string')
    throw invalidArgType(name, 'of type string or an instance of Buffer, TypedArray, or DataView', buffer);
};

const toEncoding = (encoding: unknown): BufferEncoding =>
  typeof encoding === 'string' && Buffer.isEncoding(encoding) ? (encoding as BufferEncoding) : 'utf8';

const validateEncoding = (data: string, encoding: unknown): void => {
  if (toEncoding(encoding) === 'hex' && data.length % 2 !== 0)
    throw invalidArgValue('encoding', encoding, 'is invalid for data of length ' + data.length);
};

const viewToBuffer = (view: ArrayBufferView): Buffer =>
  Buffer.isBuffer(view) ? view : Buffer.from(view.buffer, view.byteOffset, view.byteLength);

/**
 * libuv seeks only to a safe non-negative integer; every other value leaves the file description's
 * own offset in charge (`GetOffset`, `src/node_file.cc`).
 */
const seekPosition = (position: unknown): number | null =>
  typeof position === 'number' && position >= 0 && Number.isSafeInteger(position) ? position : null;

/** A read position has already passed `validatePosition`, so only `-1` still means "current". */
const readPosition = (position: number | bigint): number | null => {
  if (typeof position === 'bigint') return position < 0n ? null : Number(position);
  return position < 0 ? null : position;
};

export interface IReadOptions {
  offset?: number | null;
  length?: number | null;
  position?: number | bigint | null;
}

export interface IReadParams extends IReadOptions {
  buffer?: Buffer | ArrayBufferView | DataView;
}

export interface IWriteOptions {
  offset?: number | null;
  length?: number | null;
  position?: number | null;
}

export type ReadCallback = (
  err?: Error | null,
  bytesRead?: number,
  buffer?: Buffer | ArrayBufferView | DataView,
) => void;

export interface ReadArgs {
  buffer: ArrayBufferView;
  offset: number;
  length: number;
  /** `null` reads from the file description's current position. */
  position: number | null;
}

export interface ReadCallbackArgs extends ReadArgs {
  callback: (...args) => void;
}

/**
 * `readSync(fd, buffer, offsetOrOptions, length, position)`.
 *
 * @param argc How many arguments the caller passed, `fd` included: three or fewer make the third an
 *   options object even when it is a number.
 */
export const getReadSyncArgs = (argc: number, buffer: unknown, a?: unknown, b?: unknown, c?: unknown): ReadArgs => {
  validateBuffer(buffer);
  const view = buffer as ArrayBufferView;
  let offset: any = a;
  let length: any = b;
  let position: any = c;
  if (argc <= 3 || typeof a === 'object') {
    if (a !== undefined) validateOptions(a, 'options');
    const options: any = a ?? {};
    offset = options.offset !== undefined ? options.offset : 0;
    length = options.length !== undefined ? options.length : view.byteLength - offset;
    position = options.position !== undefined ? options.position : null;
  }
  if (offset === undefined) offset = 0;
  else validateInteger(offset, 'offset', 0);
  length = length | 0;
  if (position === undefined || position === null) position = -1;
  else validatePosition(position, 'position', length);
  if (length !== 0) {
    if (view.byteLength === 0) throw invalidArgValue('buffer', view, 'is empty and cannot be written');
    validateOffsetLengthRead(offset, length, view.byteLength);
  }
  return { buffer: view, offset, length, position: readPosition(position) };
};

/**
 * `read(fd, buffer, offsetOrOptions, length, position, callback)`.
 *
 * @param argc How many arguments the caller passed, `fd` included: four or fewer select one of the
 *   options, params or bare-callback forms.
 */
export const getReadArgs = (
  argc: number,
  buffer: unknown,
  a?: unknown,
  b?: unknown,
  c?: unknown,
  d?: unknown,
): ReadCallbackArgs => {
  let buf: any = buffer;
  let params: unknown = null;
  let offset: any = a;
  let length: any = b;
  let position: any = c;
  let callback: any = d;
  if (argc <= 4) {
    if (argc === 4) {
      validateOptions(a, 'options');
      callback = b;
      params = a;
    } else if (argc === 3) {
      if (!ArrayBuffer.isView(buf)) {
        params = buf;
        const source: any = buf ?? {};
        buf = source.buffer !== undefined ? source.buffer : Buffer.alloc(READ_BUFFER_SIZE);
      }
      callback = a;
    } else {
      callback = buf;
      buf = Buffer.alloc(READ_BUFFER_SIZE);
    }
    if (params !== undefined) validateOptions(params, 'options');
    const source: any = params ?? {};
    offset = source.offset !== undefined ? source.offset : 0;
    length = source.length !== undefined ? source.length : buf?.byteLength - offset;
    position = source.position !== undefined ? source.position : null;
  }
  validateBuffer(buf);
  validateFunction(callback, 'cb');
  if (offset === undefined || offset === null) offset = 0;
  else validateInteger(offset, 'offset', 0);
  length = length | 0;
  if (position === undefined || position === null) position = -1;
  else validatePosition(position, 'position', length);
  if (length !== 0) {
    if (buf.byteLength === 0) throw invalidArgValue('buffer', buf, 'is empty and cannot be written');
    validateOffsetLengthRead(offset, length, buf.byteLength);
  }
  return { buffer: buf, offset, length, position: readPosition(position), callback };
};

/** `filehandle.read(buffer | params, offset | options, length, position)`. */
export const getHandleReadArgs = (bufferOrParams: unknown, a?: unknown, b?: unknown, c?: unknown): ReadArgs => {
  let buf: any = bufferOrParams;
  let offset: any = a;
  let length: any = b;
  let position: any = c;
  if (!ArrayBuffer.isView(buf)) {
    if (bufferOrParams !== undefined) validateOptions(bufferOrParams, 'options');
    const source: any = bufferOrParams ?? {};
    buf = source.buffer !== undefined ? source.buffer : Buffer.alloc(READ_BUFFER_SIZE);
    offset = source.offset !== undefined ? source.offset : 0;
    // the `length` default reads `buf.byteLength` before `validateBuffer`, so a null params.buffer
    // throws a codeless TypeError here, exactly as Node does
    length = source.length !== undefined ? source.length : buf.byteLength - offset;
    position = source.position !== undefined ? source.position : null;
    validateBuffer(buf);
  }
  if (offset !== null && typeof offset === 'object') {
    const options: any = offset;
    offset = options.offset !== undefined ? options.offset : 0;
    length = options.length !== undefined ? options.length : buf.byteLength - offset;
    position = options.position !== undefined ? options.position : null;
  }
  if (offset === undefined || offset === null) offset = 0;
  else validateInteger(offset, 'offset', 0);
  if (length === undefined || length === null) length = buf.byteLength - offset;
  if (position === undefined || position === null) position = -1;
  else validatePosition(position, 'position', length);
  if (length !== 0) {
    if (buf.byteLength === 0) throw invalidArgValue('buffer', buf, 'is empty and cannot be written');
    validateOffsetLengthRead(offset, length, buf.byteLength);
  }
  return { buffer: buf, offset, length, position: readPosition(position) };
};

/** `filehandle.write(buffer | string, offset | options | position, length | encoding, position)`. */
export const getHandleWriteArgs = (data: unknown, a?: unknown, b?: unknown, c?: unknown): WriteArgs | null => {
  // an empty buffer resolves 0 before anything is validated (`promises.js` `write`)
  if ((data as any)?.byteLength === 0) return null;
  let offset: any = a;
  let length: any = b;
  let position: any = c;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    if (typeof offset === 'object') {
      const options: any = offset ?? {};
      offset = options.offset !== undefined ? options.offset : 0;
      length = options.length !== undefined ? options.length : view.byteLength - offset;
      position = options.position !== undefined ? options.position : null;
    }
    if (offset === undefined || offset === null) offset = 0;
    else validateInteger(offset, 'offset', 0);
    if (typeof length !== 'number') length = view.byteLength - offset;
    validateOffsetLengthWrite(offset, length, view.byteLength);
    return { buffer: viewToBuffer(view), offset, length, position: seekPosition(position) };
  }
  validateStringAfterArrayBufferView(data, 'buffer');
  const str = data as string;
  validateEncoding(str, length);
  const buf = bufferFrom(str, toEncoding(length));
  return { buffer: buf, offset: 0, length: buf.length, position: seekPosition(offset) };
};

/** `readv`/`writev` take the position only when it is a number, and libuv seeks only to a safe offset. */
export const getVectorArgs = (buffers: unknown, position: unknown): number | null => {
  validateBufferArray(buffers);
  return seekPosition(position);
};

export const getVectorCallbackArgs = (
  buffers: unknown,
  a: unknown,
  b: unknown,
): [position: number | null, callback: (...args) => void] => {
  validateBufferArray(buffers);
  const callback = b || a;
  validateFunction(callback, 'cb');
  return [seekPosition(a), callback as (...args) => void];
};

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
  validateInt32(fd, 'fd', 0);
  let offset: any = b;
  let length: any = c;
  let position: any = d;
  let callback: any = e;
  if (ArrayBuffer.isView(a)) {
    const view = a as ArrayBufferView;
    if (!callback) callback = position || length || offset;
    validateFunction(callback, 'cb');
    if (typeof offset === 'object') {
      const options: any = offset ?? {};
      offset = options.offset !== undefined ? options.offset : 0;
      length = options.length !== undefined ? options.length : view.byteLength - offset;
      position = options.position !== undefined ? options.position : null;
    }
    if (offset === undefined || offset === null || typeof offset === 'function') offset = 0;
    else validateInteger(offset, 'offset', 0);
    if (typeof length !== 'number') length = view.byteLength - offset;
    validateOffsetLengthWrite(offset, length, view.byteLength);
    return [fd, false, viewToBuffer(view), offset, length, seekPosition(position), callback];
  }
  validateStringAfterArrayBufferView(a, 'buffer');
  // the encoding rides in the `length` slot once the position slot is known not to hold the callback
  if (typeof position !== 'function') {
    if (typeof offset === 'function') {
      position = offset;
      offset = null;
    } else position = length;
    length = 'utf8';
  }
  const str = a as string;
  validateEncoding(str, length);
  callback = position;
  validateFunction(callback, 'cb');
  const buf = bufferFrom(str, toEncoding(length));
  return [fd, true, buf, 0, buf.length, seekPosition(offset), callback];
};

export const getWriteSyncArgs = (
  fd: number,
  a: unknown,
  b?: unknown,
  c?: unknown,
  d?: unknown,
): [fd: number, buf: Buffer, offset: number, length: number, position: number | null] => {
  let offset: any = b;
  let length: any = c;
  let position: any = d;
  if (ArrayBuffer.isView(a)) {
    const view = a as ArrayBufferView;
    if (typeof offset === 'object') {
      const options: any = offset ?? {};
      offset = options.offset !== undefined ? options.offset : 0;
      length = options.length !== undefined ? options.length : view.byteLength - offset;
      position = options.position !== undefined ? options.position : null;
    }
    if (offset === undefined || offset === null) offset = 0;
    else validateInteger(offset, 'offset', 0);
    if (typeof length !== 'number') length = view.byteLength - offset;
    validateOffsetLengthWrite(offset, length, view.byteLength);
    validateFd(fd);
    return [fd, viewToBuffer(view), offset, length, seekPosition(position)];
  }
  validateStringAfterArrayBufferView(a, 'buffer');
  const str = a as string;
  validateEncoding(str, length);
  validateFd(fd);
  const buf = bufferFrom(str, toEncoding(length));
  return [fd, buf, 0, buf.length, seekPosition(offset)];
};

export interface WriteArgs {
  buffer: Buffer;
  offset: number;
  length: number;
  position: number | null;
}
