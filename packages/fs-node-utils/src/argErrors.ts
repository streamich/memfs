import { inspect } from './inspect';
import { addNumericalSeparator, formatNumber } from './inspectPrimitive';

const TWO_POW_32 = 4294967296;
const BIG_TWO_POW_32 = BigInt(TWO_POW_32);

/** Adds `code` the way a Node error thrown from JS has it: tagged in `toString()` and `stack`, not in `name`. */
export const withCode = <E extends Error>(error: E, code: string): E => {
  (error as any).code = code;
  const tagged = error.name + ' [' + code + ']';
  Object.defineProperty(error, 'name', { value: tagged, enumerable: false, writable: true, configurable: true });
  // reading `stack` formats its header while `name` still carries the tag
  void error.stack;
  delete (error as any).name;
  Object.defineProperty(error, 'toString', {
    value: function (this: Error) {
      return tagged + ': ' + this.message;
    },
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return error;
};

/** Adds `code` the way a Node error thrown from C++ has it: nowhere else. */
export const withNativeCode = <E extends Error>(error: E, code: string): E => {
  (error as any).code = code;
  return error;
};

const kindOf = (name: string): string => (name.indexOf('.') === -1 ? 'argument' : 'property');

/** `determineSpecificType()` of `lib/internal/errors.js`. */
const describeType = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  switch (typeof value) {
    case 'bigint':
      return 'type bigint (' + value + 'n)';
    case 'number':
      return 'type number (' + formatNumber(value) + ')';
    case 'boolean':
      return 'type boolean (' + value + ')';
    case 'symbol':
      return 'type symbol (' + value.toString() + ')';
    case 'function':
      return 'function ' + value.name;
    case 'string': {
      const str = value.length > 28 ? value.slice(0, 25) + '...' : value;
      return str.indexOf("'") === -1 ? "type string ('" + str + "')" : 'type string (' + JSON.stringify(str) + ')';
    }
  }
  const ctor = (value as any).constructor;
  return ctor && 'name' in ctor ? 'an instance of ' + ctor.name : inspect(value, -1);
};

const describeNativeType = (value: unknown): string => {
  switch (typeof value) {
    case 'bigint':
      return 'type bigint (' + value + ')';
    case 'symbol':
      return value.toString();
    case 'function':
      return 'function';
    case 'object': {
      if (value === null) break;
      const ctor = (value as any).constructor;
      return 'an instance of ' + ((ctor && ctor.name) || 'Object');
    }
  }
  return describeType(value);
};

/**
 * @param expected Worded as Node words it, `of type string` or `an instance of Buffer or URL`.
 * @param native Shape the error as Node's C++ throws it.
 */
export const invalidArgType = (name: string, expected: string, actual: unknown, native?: boolean): TypeError => {
  const head = name.endsWith(' argument') ? 'The ' + name + ' ' : 'The "' + name + '" ' + kindOf(name) + ' ';
  const received = native ? describeNativeType(actual) : describeType(actual);
  const error = new TypeError(head + 'must be ' + expected + '. Received ' + received);
  return native ? withNativeCode(error, 'ERR_INVALID_ARG_TYPE') : withCode(error, 'ERR_INVALID_ARG_TYPE');
};

export const invalidArgValue = (name: string, value: unknown, reason: string = 'is invalid'): TypeError => {
  let inspected = inspect(value);
  if (inspected.length > 128) inspected = inspected.slice(0, 128) + '...';
  return withCode(
    new TypeError('The ' + kindOf(name) + " '" + name + "' " + reason + '. Received ' + inspected),
    'ERR_INVALID_ARG_VALUE',
  );
};

/** @param native Shape the error as Node's C++ throws it, which also skips digit grouping. */
export const outOfRange = (name: string, range: string, value: unknown, native?: boolean): RangeError => {
  const message = 'The value of "' + name + '" is out of range. It must be ' + range + '. Received ';
  if (native) return withNativeCode(new RangeError(message + String(value)), 'ERR_OUT_OF_RANGE');
  let received: string;
  if (Number.isInteger(value) && Math.abs(value as number) > TWO_POW_32) received = addNumericalSeparator('' + value);
  else if (typeof value === 'bigint') {
    received = '' + value;
    if (value > BIG_TWO_POW_32 || value < -BIG_TWO_POW_32) received = addNumericalSeparator(received);
    received += 'n';
  } else received = inspect(value);
  return withCode(new RangeError(message + received), 'ERR_OUT_OF_RANGE');
};

export const invalidThis = (type: string): TypeError =>
  withCode(new TypeError('Value of "this" must be of type ' + type), 'ERR_INVALID_THIS');

export const methodNotImplemented = (method: string): Error =>
  withCode(new Error('The ' + method + ' method is not implemented'), 'ERR_METHOD_NOT_IMPLEMENTED');

export const invalidUrlScheme = (expected: string): TypeError =>
  withCode(new TypeError('The URL must be of scheme ' + expected), 'ERR_INVALID_URL_SCHEME');
