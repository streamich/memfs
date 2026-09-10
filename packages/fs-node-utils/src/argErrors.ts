const kIndexOf = (str: string, search: string): boolean => str.indexOf(search) >= 0;

const withCode = <E extends Error>(error: E, code: string): E => {
  (error as any).code = code;
  const tagged = error.name + ' [' + code + ']';
  Object.defineProperty(error, 'name', { value: tagged, enumerable: false, writable: true, configurable: true });
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

const ESCAPES: Record<string, string> = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '\\': '\\\\',
};

const escapeString = (str: string, quote: string): string => {
  let out = '';
  const length = str.length;
  for (let i = 0; i < length; i++) {
    const char = str[i];
    const escape = ESCAPES[char];
    if (escape !== undefined) out += escape;
    else if (char === quote) out += '\\' + char;
    else {
      const code = str.charCodeAt(i);
      if (code >= 0x20 && code !== 0x7f) out += char;
      else out += '\\x' + (code < 16 ? '0' : '') + code.toString(16).toUpperCase();
    }
  }
  return out;
};

/** `strEscape()` of `lib/internal/util/inspect.js`. */
const quoteString = (str: string): string => {
  let quote = "'";
  if (kIndexOf(str, "'")) {
    if (!kIndexOf(str, '"')) quote = '"';
    else if (!kIndexOf(str, '`') && !kIndexOf(str, '${')) quote = '`';
  }
  return quote + escapeString(str, quote) + quote;
};

const objectPrefix = (value: object): string => {
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return '[Object: null prototype] ';
  const name = proto.constructor && proto.constructor.name;
  return !name || name === 'Object' ? '' : name + ' ';
};

/** Enough of `util.inspect` for the values that reach a validation message. */
const inspect = (value: unknown, depth: number = 2): string => {
  if (value === null) return 'null';
  const type = typeof value;
  switch (type) {
    case 'undefined':
      return 'undefined';
    case 'string':
      return quoteString(value as string);
    case 'bigint':
      return String(value) + 'n';
    case 'symbol':
      return String(value);
    case 'boolean':
      return String(value);
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value);
    case 'function': {
      const name = (value as Function).name;
      return name ? '[Function: ' + name + ']' : '[Function (anonymous)]';
    }
  }
  const isArray = Array.isArray(value);
  if (depth < 0) return isArray ? '[Array]' : '[Object]';
  if (isArray) {
    const length = (value as unknown[]).length;
    if (!length) return '[]';
    let out = '[ ';
    for (let i = 0; i < length; i++) out += (i ? ', ' : '') + inspect((value as unknown[])[i], depth - 1);
    return out + ' ]';
  }
  const prefix = objectPrefix(value as object);
  const keys = Object.keys(value as object);
  if (!keys.length) return prefix + '{}';
  let out = prefix + '{ ';
  for (let i = 0; i < keys.length; i++)
    out += (i ? ', ' : '') + keys[i] + ': ' + inspect((value as any)[keys[i]], depth - 1);
  return out + ' }';
};

/** `determineSpecificType()` of `lib/internal/errors.js`. */
const specificType = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const type = typeof value;
  switch (type) {
    case 'bigint':
      return 'type bigint (' + value + 'n)';
    case 'number':
      return 'type number (' + (Object.is(value, -0) ? '-0' : value) + ')';
    case 'boolean':
      return 'type boolean (' + value + ')';
    case 'symbol':
      return 'type symbol (' + String(value) + ')';
    case 'function':
      return 'function ' + (value as Function).name;
    case 'object': {
      const ctor = (value as object).constructor;
      return ctor && 'name' in ctor ? 'an instance of ' + ctor.name : inspect(value, 0);
    }
    case 'string': {
      let str = value as string;
      if (str.length > 28) str = str.slice(0, 25) + '...';
      return kIndexOf(str, "'") ? 'type string (' + JSON.stringify(str) + ')' : "type string ('" + str + "')";
    }
  }
  let text = inspect(value);
  if (text.length > 28) text = text.slice(0, 25) + '...';
  return 'type ' + type + ' (' + text + ')';
};

const kindOf = (name: string): string => (kIndexOf(name, '.') ? 'property' : 'argument');

export const invalidArgType = (name: string, expected: string, actual: unknown): TypeError => {
  const head = name.endsWith(' argument') ? 'The ' + name + ' ' : 'The "' + name + '" ' + kindOf(name) + ' ';
  return withCode(
    new TypeError(head + 'must be ' + expected + '. Received ' + specificType(actual)),
    'ERR_INVALID_ARG_TYPE',
  );
};

export const invalidArgValue = (name: string, value: unknown, reason: string = 'is invalid'): TypeError => {
  let inspected = inspect(value);
  if (inspected.length > 128) inspected = inspected.slice(0, 128) + '...';
  return withCode(
    new TypeError('The ' + kindOf(name) + " '" + name + "' " + reason + '. Received ' + inspected),
    'ERR_INVALID_ARG_VALUE',
  );
};

/** `addNumericalSeparator()` of `lib/internal/errors.js`. */
const separated = (val: string): string => {
  let res = '';
  let i = val.length;
  const start = val.charCodeAt(0) === 45 ? 1 : 0;
  for (; i >= start + 4; i -= 3) res = '_' + val.slice(i - 3, i) + res;
  return val.slice(0, i) + res;
};

const TWO_POW_32 = 4294967296;
const BIG_TWO_POW_32 = BigInt(TWO_POW_32);

export const outOfRange = (name: string, range: string, value: unknown): RangeError => {
  let received: string;
  if (Number.isInteger(value) && Math.abs(value as number) > TWO_POW_32) received = separated(String(value));
  else if (typeof value === 'bigint') {
    received = String(value);
    if (value > BIG_TWO_POW_32 || value < -BIG_TWO_POW_32) received = separated(received);
    received += 'n';
  } else received = inspect(value);
  return withCode(
    new RangeError('The value of "' + name + '" is out of range. It must be ' + range + '. Received ' + received),
    'ERR_OUT_OF_RANGE',
  );
};
