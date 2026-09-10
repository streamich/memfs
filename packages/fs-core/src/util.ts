import { resolve as pathResolve } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { Buffer, bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import process from './process';
import { ENCODING_UTF8, pathSep } from '@jsonjoy.com/fs-node-utils';
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

const INT32_MAX = 2147483647;

const withCode = <E extends Error>(error: E, code: string): E => {
  (error as any).code = code;
  return error;
};

/** Node `lib/internal/errors.js` `determineSpecificType`. */
const describeType = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const type = typeof value;
  switch (type) {
    case 'bigint':
      return 'type bigint (' + value + 'n)';
    case 'number':
      return 'type number (' + (Object.is(value, -0) ? '-0' : String(value)) + ')';
    case 'boolean':
    case 'symbol':
      return 'type ' + type + ' (' + String(value) + ')';
    case 'function':
      return 'function ' + (value as Function).name;
    case 'string': {
      const short = (value as string).length > 28 ? (value as string).slice(0, 25) + '...' : (value as string);
      return short.indexOf("'") === -1
        ? "type string ('" + short + "')"
        : 'type string (' + JSON.stringify(short) + ')';
    }
    default: {
      const ctor = (value as any).constructor;
      if (ctor && 'name' in ctor) return 'an instance of ' + ctor.name;
      // a no constructor object, Node renders with `inspect(value, {depth: -1})`
      return '[Object: null prototype]' + (Object.keys(value as object).length ? '' : ' {}');
    }
  }
};

const ESCAPED: Record<number, string> = { 8: '\\b', 9: '\\t', 10: '\\n', 12: '\\f', 13: '\\r' };

/** Node `lib/internal/util/inspect.js` `strEscape`. */
const escapeString = (value: string, quote: string): string => {
  const length = value.length;
  let out = '';
  for (let i = 0; i < length; i++) {
    const char = value[i];
    if (char === quote || char === '\\') {
      out += '\\' + char;
      continue;
    }
    const code = value.charCodeAt(i);
    if ((code > 31 && code < 127) || code > 159) {
      out += char;
      continue;
    }
    out += ESCAPED[code] ?? '\\x' + code.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
};

const quoteString = (value: string): string => {
  const quote =
    value.indexOf("'") === -1 ? "'" : value.indexOf('"') === -1 ? '"' : value.indexOf('`') === -1 ? '`' : "'";
  return quote + escapeString(value, quote) + quote;
};

/** `INSPECT_MAX_BYTES` for a `Buffer`, `maxArrayLength` for any other `Uint8Array`. */
const inspectBytes = (bytes: Uint8Array): string => {
  const length = bytes.length;
  if (Buffer.isBuffer(bytes)) {
    const shown = length > 50 ? 50 : length;
    let out = '<Buffer';
    for (let i = 0; i < shown; i++) out += ' ' + bytes[i].toString(16).padStart(2, '0');
    return out + (length > shown ? ' ... ' + (length - shown) + ' more bytes>' : '>');
  }
  const shown = length > 100 ? 100 : length;
  let out = 'Uint8Array(' + length + ') [';
  for (let i = 0; i < shown; i++) out += (i ? ', ' : ' ') + bytes[i];
  if (length > shown) return out + ', ... ' + (length - shown) + ' more items ]';
  return out + (shown ? ' ]' : ']');
};

/** Node `util.inspect` narrowed to `ERR_INVALID_ARG_VALUE` values. */
const inspectValue = (value: unknown): string => {
  if (typeof value === 'string') return quoteString(value);
  if (value instanceof Uint8Array) return inspectBytes(value);
  if (typeof value === 'bigint') return value + 'n';
  if (value === null || typeof value !== 'object') return String(value);
  const ctor = (value as any).constructor;
  return ctor && 'name' in ctor ? '[' + (ctor.name || 'Object') + ']' : '[Object: null prototype]';
};

const invalidArgType = (name: string, expected: string, value: unknown): TypeError =>
  withCode(
    new TypeError('The "' + name + '" argument must be ' + expected + '. Received ' + describeType(value)),
    'ERR_INVALID_ARG_TYPE',
  );

const invalidArgValue = (name: string, value: unknown, reason: string): TypeError => {
  const inspected = inspectValue(value);
  const received = inspected.length > 128 ? inspected.slice(0, 128) + '...' : inspected;
  const kind = name.indexOf('.') === -1 ? 'argument' : 'property';
  return withCode(
    new TypeError('The ' + kind + " '" + name + "' " + reason + '. Received ' + received),
    'ERR_INVALID_ARG_VALUE',
  );
};

// TODO: Node groups the digits of a large integer (`1_099_511_627_776`) only where the fd reaches
// `validateInt32` in JS - the `read`/`readv`/`write`/`writev` family - while the C++ path every
// other fd site takes does not; the same split renders a bigint as `5n` there and `5` here. One
// shared validator cannot do both until its call sites can say which of the two they are.
const outOfRange = (name: string, range: string, value: number): RangeError =>
  withCode(
    new RangeError('The value of "' + name + '" is out of range. It must be ' + range + '. Received ' + value),
    'ERR_OUT_OF_RANGE',
  );

/** Node `lib/internal/fs/utils.js` `getValidatedFd`. */
export function validateFd(fd) {
  if (typeof fd !== 'number') throw invalidArgType('fd', 'of type number', fd);
  if (!Number.isInteger(fd)) throw outOfRange('fd', 'an integer', fd);
  if (fd < 0 || fd > INT32_MAX) throw outOfRange('fd', '>= 0 && <= ' + INT32_MAX, fd);
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
  if (url.protocol !== 'file:')
    throw withCode(new TypeError('The URL must be of scheme file'), 'ERR_INVALID_URL_SCHEME');
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
