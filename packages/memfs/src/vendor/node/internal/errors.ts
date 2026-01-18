// Adapted from Node.js ../internal/errors.js, used for throwing similar errors to Node.js.

import { inspect, format } from '../util';

const kCode = typeof Symbol === 'undefined' ? '_kCode' : (Symbol as any)('code');
const messages = {};

function makeNodeError(Base) {
  return class NodeError extends Base {
    constructor(key, ...args) {
      super(message(key, args));
      this.code = key;
      this[kCode] = key;
      this.name = `${super.name} [${this[kCode]}]`;
    }
  };
}

const g = typeof globalThis !== 'undefined' ? globalThis : global;

class AssertionError extends g.Error {
  generatedMessage: any;
  name: any;
  code: any;
  actual: any;
  expected: any;
  operator: any;

  constructor(options) {
    if (typeof options !== 'object' || options === null) {
      throw new exports.TypeError('ERR_INVALID_ARG_TYPE', 'options', 'object');
    }
    if (options.message) {
      super(options.message);
    } else {
      super(
        `${inspect(options.actual).slice(0, 128)} ` + `${options.operator} ${inspect(options.expected).slice(0, 128)}`,
      );
    }

    this.generatedMessage = !options.message;
    this.name = 'AssertionError [ERR_ASSERTION]';
    this.code = 'ERR_ASSERTION';
    this.actual = options.actual;
    this.expected = options.expected;
    this.operator = options.operator;
    Error.captureStackTrace(this, options.stackStartFunction);
  }
}

function message(key, args) {
  if (typeof key !== 'string') throw new Error('Error message key must be a string');
  const msg = messages[key];
  if (!msg) throw new Error(`An invalid error message key was used: ${key}.`);
  let fmt;
  if (typeof msg === 'function') {
    fmt = msg;
  } else {
    fmt = format;
    if (args === undefined || args.length === 0) return msg;
    args.unshift(msg);
  }
  return String(fmt.apply(null, args));
}

// Utility function for registering the error codes. Only used here. Exported
// *only* to allow for testing.
function E(sym, val) {
  messages[sym] = typeof val === 'function' ? val : String(val);
}

export const Error = makeNodeError(g.Error);
export const TypeError = makeNodeError(g.TypeError);
export const RangeError = makeNodeError(g.RangeError);

export { message, AssertionError, E };

E('ERR_DIR_CLOSED', 'Directory handle was closed');
E(
  'ERR_DIR_CONCURRENT_OPERATION',
  'Cannot do synchronous work on directory handle with concurrent asynchronous operations',
);
E('ERR_INVALID_FILE_URL_HOST', 'File URL host must be "localhost" or empty on %s');
E('ERR_INVALID_FILE_URL_PATH', 'File URL path %s');
E('ERR_INVALID_OPT_VALUE', (name, value) => {
  return `The value "${String(value)}" is invalid for option "${name}"`;
});
E('ERR_INVALID_OPT_VALUE_ENCODING', value => `The value "${String(value)}" is invalid for option "encoding"`);
E('ERR_INVALID_ARG_VALUE', 'Unable to open file as blob');
