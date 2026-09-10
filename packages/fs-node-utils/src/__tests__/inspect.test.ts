import { inspect } from '../inspect';

const S = String.fromCharCode;

// `util.inspect` of Node 24.20
const CASES: [label: string, make: () => unknown, expected: string][] = [
  ['undefined', () => undefined, 'undefined'],
  ['null', () => null, 'null'],
  ['true', () => true, 'true'],
  ['0', () => 0, '0'],
  ['-0', () => -0, '-0'],
  ['NaN', () => NaN, 'NaN'],
  ['-Infinity', () => -Infinity, '-Infinity'],
  ['1.5', () => 1.5, '1.5'],
  ['2**32', () => 2 ** 32, '4294967296'],
  ['2**32+1', () => 2 ** 32 + 1, '4294967297'],
  ['-(2**40)', () => -(2 ** 40), '-1099511627776'],
  ['5n', () => 5n, '5n'],
  ['2n**32n', () => 2n ** 32n, '4294967296n'],
  ['2n**32n+1n', () => 2n ** 32n + 1n, '4294967297n'],
  ['-(2n**40n)', () => -(2n ** 40n), '-1099511627776n'],
  ['Symbol(s)', () => Symbol('s'), 'Symbol(s)'],
  ['Symbol()', () => Symbol(), 'Symbol()'],
  ['empty string', () => '', "''"],
  ['abc', () => 'abc', "'abc'"],
  ["it's", () => "it's", '"it\'s"'],
  ['a"b', () => 'a"b', "'a\"b'"],
  ['single+double', () => 'a\'"b', '`a\'"b`'],
  ['single+double+backtick', () => 'a\'"`b', "'a\\'\"`b'"],
  ['single+double+dollar-brace', () => 'a\'"${b', "'a\\'\"${b'"],
  ['controls', () => 'a\nb\tc\\d' + S(0, 8, 11, 27, 31), "'a\\nb\\tc\\\\d\\x00\\b\\x0B\\x1B\\x1F'"],
  ['del and C1', () => S(0x7f, 0x80, 0x9f, 0xa0), "'\\x7F\\x80\\x9F '"],
  ['lone high surrogate', () => 'a' + S(0xd800) + 'b', "'a\\ud800b'"],
  ['lone low surrogate', () => 'a' + S(0xdc00) + 'b', "'a\\udc00b'"],
  ['surrogate pair', () => S(0xd83d, 0xde00), "'😀'"],
  ['string 40', () => 'x'.repeat(40), "'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'"],
  [
    'string 200',
    () => 'x'.repeat(200),
    "'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'",
  ],
  [
    'string 200 newlines',
    () => 'abcdefghij\n'.repeat(20),
    "'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n' +\n  'abcdefghij\\n'",
  ],
  ['Buffer 3', () => Buffer.from([97, 0, 98]), '<Buffer 61 00 62>'],
  ['Buffer 0', () => Buffer.alloc(0), '<Buffer >'],
  [
    'Buffer 60',
    () => Buffer.alloc(60),
    '<Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ... 10 more bytes>',
  ],
  ['Uint8Array 3', () => new Uint8Array([97, 0, 98]), 'Uint8Array(3) [ 97, 0, 98 ]'],
  ['Uint8Array 0', () => new Uint8Array(0), 'Uint8Array(0) []'],
  [
    'Uint8Array 7',
    () => new Uint8Array([47, 97, 0, 98, 99, 100, 101]),
    'Uint8Array(7) [\n  47,  97,   0, 98,\n  99, 100, 101\n]',
  ],
  [
    'Uint8Array 120',
    () => new Uint8Array(120),
    'Uint8Array(120) [\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0,\n  ... 20 more items\n]',
  ],
  ['Int16Array', () => new Int16Array([1, -2]), 'Int16Array(2) [ 1, -2 ]'],
  ['Float64Array', () => new Float64Array([1.5, -0]), 'Float64Array(2) [ 1.5, -0 ]'],
  ['BigInt64Array', () => new BigInt64Array([1n]), 'BigInt64Array(1) [ 1n ]'],
  [
    'DataView 2',
    () => new DataView(new ArrayBuffer(2)),
    'DataView {\n  [byteLength]: 2,\n  [byteOffset]: 0,\n  [buffer]: ArrayBuffer { [Uint8Contents]: <00 00>, [byteLength]: 2 }\n}',
  ],
  ['ArrayBuffer 2', () => new ArrayBuffer(2), 'ArrayBuffer { [Uint8Contents]: <00 00>, [byteLength]: 2 }'],
  ['empty array', () => [], '[]'],
  ['array mixed', () => [1, 'a', null, undefined], "[ 1, 'a', null, undefined ]"],
  ['array 6', () => [1, 2, 3, 4, 5, 6], '[ 1, 2, 3, 4, 5, 6 ]'],
  ['array 7', () => [1, 2, 3, 4, 5, 6, 7], '[\n  1, 2, 3, 4,\n  5, 6, 7\n]'],
  [
    'array 26 strings',
    () => 'abcdefghijklmnopqrstuvwxyz'.split(''),
    "[\n  'a', 'b', 'c', 'd', 'e', 'f',\n  'g', 'h', 'i', 'j', 'k', 'l',\n  'm', 'n', 'o', 'p', 'q', 'r',\n  's', 't', 'u', 'v', 'w', 'x',\n  'y', 'z'\n]",
  ],
  [
    'array 120',
    () => new Array(120).fill(0),
    '[\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,\n  0, 0, 0, 0,\n  ... 20 more items\n]',
  ],
  ['array nested', () => [[1, [2, [3, [4]]]]], '[ [ 1, [ 2, [Array] ] ] ]'],
  ['array sparse', () => [1, , 3], '[ 1, <1 empty item>, 3 ]'],
  ['empty object', () => ({}), '{}'],
  ['object', () => ({ a: 1, b: 'x' }), "{ a: 1, b: 'x' }"],
  ['object keys', () => ({ 'a-b': 1, _c: 2, $d: 3, 1: 4 }), "{ '1': 4, 'a-b': 1, _c: 2, '$d': 3 }"],
  ['object nested 4', () => ({ a: { b: { c: { d: 1 } } } }), '{ a: { b: { c: [Object] } } }'],
  ['object nested 3', () => ({ a: { b: { c: 1 } } }), '{ a: { b: { c: 1 } } }'],
  [
    'object wide',
    () => ({ alpha: 'x'.repeat(30), beta: 'y'.repeat(30), gamma: 'z'.repeat(30), delta: 1 }),
    "{\n  alpha: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',\n  beta: 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',\n  gamma: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',\n  delta: 1\n}",
  ],
  ['null proto empty', () => Object.create(null), '[Object: null prototype] {}'],
  ['null proto', () => Object.assign(Object.create(null), { a: 1 }), '[Object: null prototype] { a: 1 }'],
  [
    'class instance',
    () =>
      new (class Foo {
        constructor() {
          (this as any).x = 1;
        }
      })(),
    'Foo { x: 1 }',
  ],
  ['class instance empty', () => new (class Foo {})(), 'Foo {}'],
  [
    'getter',
    () => ({
      get a() {
        return 1;
      },
    }),
    '{ a: [Getter] }',
  ],
  ['setter', () => ({ set a(x: unknown) {} }), '{ a: [Setter] }'],
  [
    'getter setter',
    () => ({
      get a() {
        return 1;
      },
      set a(x: unknown) {},
    }),
    '{ a: [Getter/Setter] }',
  ],
  ['symbol key', () => ({ [Symbol('k')]: 1 }), '{ Symbol(k): 1 }'],
  ['object with array', () => ({ a: [1, 2] }), '{ a: [ 1, 2 ] }'],
  ['function', () => function foo() {}, '[Function: foo]'],
  ['anonymous function', () => function () {}, '[Function (anonymous)]'],
  ['arrow', () => () => {}, '[Function (anonymous)]'],
  ['class', () => class Foo {}, '[class Foo]'],
  ['class extends', () => class Bar extends Array {}, '[class Bar extends Array]'],
  ['async function', () => async function af() {}, '[AsyncFunction: af]'],
  ['generator', () => function* gf() {}, '[GeneratorFunction: gf]'],
  ['function with props', () => Object.assign(function f() {}, { a: 1 }), '[Function: f] { a: 1 }'],
  ['Date', () => new Date(0), '1970-01-01T00:00:00.000Z'],
  ['invalid Date', () => new Date(NaN), 'Invalid Date'],
  ['RegExp', () => /re/g, '/re/g'],
  ['Map', () => new Map([[1, 'a']]), "Map(1) { 1 => 'a' }"],
  ['Set', () => new Set([1]), 'Set(1) { 1 }'],
  ['boxed String', () => new String('s'), "[String: 's']"],
  ['boxed Number', () => new Number(1), '[Number: 1]'],
  [
    'circular',
    () => {
      const o: any = { a: null };
      o.a = o;
      return o;
    },
    '<ref *1> { a: [Circular *1] }',
  ],
  ['null-proto Map', () => Object.setPrototypeOf(new Map([[1, 2]]), null), '[Map(1): null prototype] { 1 => 2 }'],
  ['null-proto Set', () => Object.setPrototypeOf(new Set([1]), null), '[Set(1): null prototype] { 1 }'],
  [
    'null-proto Uint8Array',
    () => Object.setPrototypeOf(new Uint8Array([1, 2]), null),
    '[Uint8Array(2): null prototype] [ 1, 2 ]',
  ],
  ['null-proto Array', () => Object.setPrototypeOf([1, 2], null), '[Array(2): null prototype] [ 1, 2 ]'],
  ['null-proto RegExp', () => Object.setPrototypeOf(/a/g, null), '[RegExp: null prototype] /a/g'],
  [
    'null-proto Date',
    () => Object.setPrototypeOf(new Date(0), null),
    '[Date: null prototype] 1970-01-01T00:00:00.000Z',
  ],
  [
    'detached DataView',
    () => {
      const b = new ArrayBuffer(2);
      const d = new DataView(b);
      structuredClone(b, { transfer: [b] });
      return d;
    },
    'DataView {\n      [byteLength]: 0,\n      [byteOffset]: undefined,\n      [buffer]: ArrayBuffer { (detached), [byteLength]: 0 }\n    }',
  ],
  [
    'SharedArrayBuffer',
    () => new SharedArrayBuffer(2),
    'SharedArrayBuffer { [Uint8Contents]: <00 00>, [byteLength]: 2 }',
  ],
  ['Error prototype object', () => Object.create(Error.prototype), '[Error]'],
  ['fake Arguments tag', () => ({ [Symbol.toStringTag]: 'Arguments' }), "{ Symbol(Symbol.toStringTag): 'Arguments' }"],
  [
    'arguments',
    () =>
      (function (..._: unknown[]) {
        return arguments;
      })(1, 2),
    "[Arguments] { '0': 1, '1': 2 }",
  ],
  ['Array with Object.prototype', () => Object.setPrototypeOf([1], Object.prototype), "{ '0': 1 }"],
  [
    'Uint8Array with Object.prototype',
    () => Object.setPrototypeOf(new Uint8Array([1]), Object.prototype),
    "{ '0': 1 }",
  ],
  [
    'null-proto at depth limit',
    () => ({ a: { b: { c: Object.setPrototypeOf([1], null), d: Object.setPrototypeOf(new Map([[1, 2]]), null) } } }),
    '{ a: { b: { c: [Array: null prototype], d: [Map: null prototype] } } }',
  ],
];

describe('inspect matches Node', () => {
  test.each(CASES)('%s', (label, make, expected) => {
    expect(inspect(make())).toBe(expected);
  });
});
