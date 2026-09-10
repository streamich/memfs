import { invalidArgType, invalidArgValue, outOfRange } from './argErrors';

export const INT32_MAX = 2147483647;

const INT32_MIN = -2147483648;
const UINT32_MAX = 4294967295;
const MAX_SAFE = 9007199254740991;

export const enum ValidateObject {
  AllowNullable = 1,
  AllowArray = 2,
  AllowFunction = 4,
}

const validateRange = (value: unknown, name: string, min: number, max: number): void => {
  if (typeof value !== 'number') throw invalidArgType(name, 'of type number', value);
  if (!Number.isInteger(value)) throw outOfRange(name, 'an integer', value);
  if (value < min || value > max) throw outOfRange(name, '>= ' + min + ' && <= ' + max, value);
};

export const validateInteger = (value: unknown, name: string, min: number = -MAX_SAFE, max: number = MAX_SAFE): void =>
  validateRange(value, name, min, max);

export const validateInt32 = (value: unknown, name: string, min: number = INT32_MIN, max: number = INT32_MAX): void =>
  validateRange(value, name, min, max);

export const validateUint32 = (value: unknown, name: string, positive?: boolean): void =>
  validateRange(value, name, positive ? 1 : 0, UINT32_MAX);

export const validateString = (value: unknown, name: string): void => {
  if (typeof value !== 'string') throw invalidArgType(name, 'of type string', value);
};

export const validateBoolean = (value: unknown, name: string): void => {
  if (typeof value !== 'boolean') throw invalidArgType(name, 'of type boolean', value);
};

export const validateFunction = (value: unknown, name: string): void => {
  if (typeof value !== 'function') throw invalidArgType(name, 'of type function', value);
};

/** @param options `ValidateObject` flags. */
export const validateObject = (value: unknown, name: string, options: number = 0): void => {
  if (
    (value === null && !(options & ValidateObject.AllowNullable)) ||
    (Array.isArray(value) && !(options & ValidateObject.AllowArray)) ||
    (value !== null &&
      typeof value !== 'object' &&
      (typeof value !== 'function' || !(options & ValidateObject.AllowFunction)))
  )
    throw invalidArgType(name, 'of type object', value);
};

export const validateOneOf = (value: unknown, name: string, oneOf: readonly unknown[]): void => {
  if (oneOf.includes(value)) return;
  let allowed = '';
  for (let i = 0; i < oneOf.length; i++) {
    const one = oneOf[i];
    allowed += (i ? ', ' : '') + (typeof one === 'string' ? "'" + one + "'" : String(one));
  }
  throw invalidArgValue(name, value, 'must be one of: ' + allowed);
};

export const validateArray = (value: unknown, name: string, minLength: number = 0): void => {
  if (!Array.isArray(value)) throw invalidArgType(name, 'an instance of Array', value);
  if (value.length < minLength) throw invalidArgValue(name, value, 'must have a length of at least ' + minLength);
};

export const validateStringArray = (value: unknown, name: string): void => {
  validateArray(value, name);
  const array = value as unknown[];
  for (let i = 0; i < array.length; i++)
    if (typeof array[i] !== 'string') throw invalidArgType(name + '[' + i + ']', 'of type string', array[i]);
};

export const validateBuffer = (buffer: unknown, name: string = 'buffer'): void => {
  if (!ArrayBuffer.isView(buffer)) throw invalidArgType(name, 'an instance of Buffer, TypedArray, or DataView', buffer);
};

export const validateAbortSignal = (signal: unknown, name: string): void => {
  if (signal !== undefined && (signal === null || typeof signal !== 'object' || !('aborted' in signal)))
    throw invalidArgType(name, 'an instance of AbortSignal', signal);
};
