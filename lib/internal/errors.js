'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var kCode = typeof Symbol === 'undefined' ? '_kCode' : Symbol('code');
var messages = {};
var assert = null;
var util = null;

function makeNodeError(Base) {
    return function (_Base) {
        _inherits(NodeError, _Base);

        function NodeError(key) {
            _classCallCheck(this, NodeError);

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            var _this = _possibleConstructorReturn(this, (NodeError.__proto__ || Object.getPrototypeOf(NodeError)).call(this, message(key, args)));

            _this.code = key;
            _this[kCode] = key;
            _this.name = _get(NodeError.prototype.__proto__ || Object.getPrototypeOf(NodeError.prototype), 'name', _this) + ' [' + _this[kCode] + ']';
            return _this;
        }

        return NodeError;
    }(Base);
}

var AssertionError = function (_Error) {
    _inherits(AssertionError, _Error);

    function AssertionError(options) {
        _classCallCheck(this, AssertionError);

        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object' || options === null) {
            throw new exports.TypeError('ERR_INVALID_ARG_TYPE', 'options', 'object');
        }
        if (options.message) {
            var _this2 = _possibleConstructorReturn(this, (AssertionError.__proto__ || Object.getPrototypeOf(AssertionError)).call(this, options.message));
        } else {
            if (util === null) util = require('util');

            var _this2 = _possibleConstructorReturn(this, (AssertionError.__proto__ || Object.getPrototypeOf(AssertionError)).call(this, util.inspect(options.actual).slice(0, 128) + ' ' + (options.operator + ' ' + util.inspect(options.expected).slice(0, 128))));
        }

        _this2.generatedMessage = !options.message;
        _this2.name = 'AssertionError [ERR_ASSERTION]';
        _this2.code = 'ERR_ASSERTION';
        _this2.actual = options.actual;
        _this2.expected = options.expected;
        _this2.operator = options.operator;
        Error.captureStackTrace(_this2, options.stackStartFunction);
        return _possibleConstructorReturn(_this2);
    }

    return AssertionError;
}(Error);

function message(key, args) {
    if (assert === null) assert = require('assert');
    assert.strictEqual(typeof key === 'undefined' ? 'undefined' : _typeof(key), 'string');

    var msg = messages[key];
    assert(msg, 'An invalid error message key was used: ' + key + '.');
    var fmt = void 0;
    if (typeof msg === 'function') {
        fmt = msg;
    } else {
        if (util === null) util = require('util');
        fmt = util.format;
        if (args === undefined || args.length === 0) return msg;
        args.unshift(msg);
    }
    return String(fmt.apply(null, args));
}

function E(sym, val) {
    messages[sym] = typeof val === 'function' ? val : String(val);
}

module.exports = exports = {
    message: message,
    Error: makeNodeError(Error),
    TypeError: makeNodeError(TypeError),
    RangeError: makeNodeError(RangeError),
    AssertionError: AssertionError,
    E: E };

E('ERR_ARG_NOT_ITERABLE', '%s must be iterable');
E('ERR_ASSERTION', '%s');
E('ERR_BUFFER_OUT_OF_BOUNDS', bufferOutOfBounds);
E('ERR_CHILD_CLOSED_BEFORE_REPLY', 'Child closed before reply received');
E('ERR_CONSOLE_WRITABLE_STREAM', 'Console expects a writable stream instance for %s');
E('ERR_CPU_USAGE', 'Unable to obtain cpu usage %s');
E('ERR_DNS_SET_SERVERS_FAILED', function (err, servers) {
    return 'c-ares failed to set servers: "' + err + '" [' + servers + ']';
});
E('ERR_FALSY_VALUE_REJECTION', 'Promise was rejected with falsy value');
E('ERR_ENCODING_NOT_SUPPORTED', function (enc) {
    return 'The "' + enc + '" encoding is not supported';
});
E('ERR_ENCODING_INVALID_ENCODED_DATA', function (enc) {
    return 'The encoded data was not valid for encoding ' + enc;
});
E('ERR_HTTP_HEADERS_SENT', 'Cannot render headers after they are sent to the client');
E('ERR_HTTP_INVALID_STATUS_CODE', 'Invalid status code: %s');
E('ERR_HTTP_TRAILER_INVALID', 'Trailers are invalid with this transfer encoding');
E('ERR_INDEX_OUT_OF_RANGE', 'Index out of range');
E('ERR_INVALID_ARG_TYPE', invalidArgType);
E('ERR_INVALID_ARRAY_LENGTH', function (name, len, actual) {
    assert.strictEqual(typeof actual === 'undefined' ? 'undefined' : _typeof(actual), 'number');
    return 'The array "' + name + '" (length ' + actual + ') must be of length ' + len + '.';
});
E('ERR_INVALID_BUFFER_SIZE', 'Buffer size must be a multiple of %s');
E('ERR_INVALID_CALLBACK', 'Callback must be a function');
E('ERR_INVALID_CHAR', 'Invalid character in %s');
E('ERR_INVALID_CURSOR_POS', 'Cannot set cursor row without setting its column');
E('ERR_INVALID_FD', '"fd" must be a positive integer: %s');
E('ERR_INVALID_FILE_URL_HOST', 'File URL host must be "localhost" or empty on %s');
E('ERR_INVALID_FILE_URL_PATH', 'File URL path %s');
E('ERR_INVALID_HANDLE_TYPE', 'This handle type cannot be sent');
E('ERR_INVALID_IP_ADDRESS', 'Invalid IP address: %s');
E('ERR_INVALID_OPT_VALUE', function (name, value) {
    return 'The value "' + String(value) + '" is invalid for option "' + name + '"';
});
E('ERR_INVALID_OPT_VALUE_ENCODING', function (value) {
    return 'The value "' + String(value) + '" is invalid for option "encoding"';
});
E('ERR_INVALID_REPL_EVAL_CONFIG', 'Cannot specify both "breakEvalOnSigint" and "eval" for REPL');
E('ERR_INVALID_SYNC_FORK_INPUT', 'Asynchronous forks do not support Buffer, Uint8Array or string input: %s');
E('ERR_INVALID_THIS', 'Value of "this" must be of type %s');
E('ERR_INVALID_TUPLE', '%s must be an iterable %s tuple');
E('ERR_INVALID_URL', 'Invalid URL: %s');
E('ERR_INVALID_URL_SCHEME', function (expected) {
    return 'The URL must be ' + oneOf(expected, 'scheme');
});
E('ERR_IPC_CHANNEL_CLOSED', 'Channel closed');
E('ERR_IPC_DISCONNECTED', 'IPC channel is already disconnected');
E('ERR_IPC_ONE_PIPE', 'Child process can have only one IPC pipe');
E('ERR_IPC_SYNC_FORK', 'IPC cannot be used with synchronous forks');
E('ERR_MISSING_ARGS', missingArgs);
E('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
E('ERR_NAPI_CONS_FUNCTION', 'Constructor must be a function');
E('ERR_NAPI_CONS_PROTOTYPE_OBJECT', 'Constructor.prototype must be an object');
E('ERR_NO_CRYPTO', 'Node.js is not compiled with OpenSSL crypto support');
E('ERR_NO_LONGER_SUPPORTED', '%s is no longer supported');
E('ERR_PARSE_HISTORY_DATA', 'Could not parse history data in %s');
E('ERR_SOCKET_ALREADY_BOUND', 'Socket is already bound');
E('ERR_SOCKET_BAD_PORT', 'Port should be > 0 and < 65536');
E('ERR_SOCKET_BAD_TYPE', 'Bad socket type specified. Valid types are: udp4, udp6');
E('ERR_SOCKET_CANNOT_SEND', 'Unable to send data');
E('ERR_SOCKET_CLOSED', 'Socket is closed');
E('ERR_SOCKET_DGRAM_NOT_RUNNING', 'Not running');
E('ERR_STDERR_CLOSE', 'process.stderr cannot be closed');
E('ERR_STDOUT_CLOSE', 'process.stdout cannot be closed');
E('ERR_STREAM_WRAP', 'Stream has StringDecoder set or is in objectMode');
E('ERR_TLS_CERT_ALTNAME_INVALID', 'Hostname/IP does not match certificate\'s altnames: %s');
E('ERR_TLS_DH_PARAM_SIZE', function (size) {
    return 'DH parameter size ' + size + ' is less than 2048';
});
E('ERR_TLS_HANDSHAKE_TIMEOUT', 'TLS handshake timeout');
E('ERR_TLS_RENEGOTIATION_FAILED', 'Failed to renegotiate');
E('ERR_TLS_REQUIRED_SERVER_NAME', '"servername" is required parameter for Server.addContext');
E('ERR_TLS_SESSION_ATTACK', 'TSL session renegotiation attack detected');
E('ERR_TRANSFORM_ALREADY_TRANSFORMING', 'Calling transform done when still transforming');
E('ERR_TRANSFORM_WITH_LENGTH_0', 'Calling transform done when writableState.length != 0');
E('ERR_UNKNOWN_ENCODING', 'Unknown encoding: %s');
E('ERR_UNKNOWN_SIGNAL', 'Unknown signal: %s');
E('ERR_UNKNOWN_STDIN_TYPE', 'Unknown stdin file type');
E('ERR_UNKNOWN_STREAM_TYPE', 'Unknown stream file type');
E('ERR_V8BREAKITERATOR', 'Full ICU data not installed. ' + 'See https://github.com/nodejs/node/wiki/Intl');

function invalidArgType(name, expected, actual) {
    assert(name, 'name is required');

    var determiner = void 0;
    if (expected.includes('not ')) {
        determiner = 'must not be';
        expected = expected.split('not ')[1];
    } else {
        determiner = 'must be';
    }

    var msg = void 0;
    if (Array.isArray(name)) {
        var names = name.map(function (val) {
            return '"' + val + '"';
        }).join(', ');
        msg = 'The ' + names + ' arguments ' + determiner + ' ' + oneOf(expected, 'type');
    } else if (name.includes(' argument')) {
        msg = 'The ' + name + ' ' + determiner + ' ' + oneOf(expected, 'type');
    } else {
        var type = name.includes('.') ? 'property' : 'argument';
        msg = 'The "' + name + '" ' + type + ' ' + determiner + ' ' + oneOf(expected, 'type');
    }

    if (arguments.length >= 3) {
        msg += '. Received type ' + (actual !== null ? typeof actual === 'undefined' ? 'undefined' : _typeof(actual) : 'null');
    }
    return msg;
}

function missingArgs() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
    }

    assert(args.length > 0, 'At least one arg needs to be specified');
    var msg = 'The ';
    var len = args.length;
    args = args.map(function (a) {
        return '"' + a + '"';
    });
    switch (len) {
        case 1:
            msg += args[0] + ' argument';
            break;
        case 2:
            msg += args[0] + ' and ' + args[1] + ' arguments';
            break;
        default:
            msg += args.slice(0, len - 1).join(', ');
            msg += ', and ' + args[len - 1] + ' arguments';
            break;
    }
    return msg + ' must be specified';
}

function oneOf(expected, thing) {
    assert(expected, 'expected is required');
    assert(typeof thing === 'string', 'thing is required');
    if (Array.isArray(expected)) {
        var len = expected.length;
        assert(len > 0, 'At least one expected value needs to be specified');
        expected = expected.map(function (i) {
            return String(i);
        });
        if (len > 2) {
            return 'one of ' + thing + ' ' + expected.slice(0, len - 1).join(', ') + ', or ' + expected[len - 1];
        } else if (len === 2) {
            return 'one of ' + thing + ' ' + expected[0] + ' or ' + expected[1];
        } else {
            return 'of ' + thing + ' ' + expected[0];
        }
    } else {
        return 'of ' + thing + ' ' + String(expected);
    }
}

function bufferOutOfBounds(name, isWriting) {
    if (isWriting) {
        return 'Attempt to write outside buffer bounds';
    } else {
        return '"' + name + '" is outside of buffer bounds';
    }
}