import { formatPrimitive } from './inspectPrimitive';

export type Key = string | symbol | number;

type Getter = (this: unknown) => any;

const INDEX_REG = /^(0|[1-9][0-9]*)$/;

export const objectToString = Object.prototype.toString;
export const hasOwn = Object.prototype.hasOwnProperty;
export const isEnumerable = Object.prototype.propertyIsEnumerable;
export const getOwn = Object.getOwnPropertyDescriptor;

const getter = (proto: object, key: PropertyKey): Getter => getOwn(proto, key)!.get as Getter;
const TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);

// prototype getters rather than properties, which a null prototype or another realm takes away
export const typedArrayTag = getter(TypedArrayPrototype, Symbol.toStringTag);
export const typedArrayLength = getter(TypedArrayPrototype, 'length');
export const setSize = getter(Set.prototype, 'size');
export const mapSize = getter(Map.prototype, 'size');
export const arrayBufferByteLength = getter(ArrayBuffer.prototype, 'byteLength');
export const sharedArrayBufferByteLength =
  typeof SharedArrayBuffer === 'undefined' ? undefined : getter(SharedArrayBuffer.prototype, 'byteLength');
export const dataViewBuffer = getter(DataView.prototype, 'buffer');
export const regExpSource = getter(RegExp.prototype, 'source');

export const hasBrand = (check: Getter, value: unknown): boolean => {
  try {
    check.call(value);
    return true;
  } catch {
    return false;
  }
};

export const isInstance = (value: object, ctor: Function): boolean => {
  try {
    return value instanceof ctor;
  } catch {
    return false;
  }
};

// TODO: Node renders `Foo <Complex prototype>` when no prototype in the chain names its constructor.
export const constructorName = (value: object): string | null => {
  let obj: object | null = value;
  let first: object | null | undefined;
  while (obj) {
    const descriptor = getOwn(obj, 'constructor');
    const ctor = descriptor && descriptor.value;
    if (typeof ctor === 'function' && ctor.name !== '' && isInstance(value, ctor)) return String(ctor.name);
    obj = Object.getPrototypeOf(obj);
    if (first === undefined) first = obj;
  }
  return first === null ? null : 'Object';
};

/** `getPrefix()` of `lib/internal/util/inspect.js`. */
export const prefixOf = (constructor: string | null, tag: string, fallback: string, size: string = ''): string => {
  if (constructor === null) {
    if (tag !== '' && fallback !== tag) return '[' + fallback + size + ': null prototype] [' + tag + '] ';
    return '[' + fallback + size + ': null prototype] ';
  }
  let result = constructor + size + ' ';
  if (tag !== '') {
    const position = constructor.indexOf(tag);
    if (position === -1) result += '[' + tag + '] ';
    else {
      const end = position + tag.length;
      if (end !== constructor.length && constructor[end] === constructor[end].toLowerCase()) result += '[' + tag + '] ';
    }
  }
  return result;
};

export const ownKeys = (value: object): Key[] => {
  const keys: Key[] = Object.keys(value);
  const symbols = Object.getOwnPropertySymbols(value);
  for (let i = 0; i < symbols.length; i++) if (isEnumerable.call(value, symbols[i])) keys.push(symbols[i]);
  return keys;
};

export const nonIndexKeys = (value: object): Key[] => {
  const keys = ownKeys(value);
  const out: Key[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (typeof key !== 'string' || !INDEX_REG.test(key) || +key > 4294967294) out.push(key);
  }
  return out;
};

export const isIndex = (key: string): boolean => INDEX_REG.test(key);

export const moreItems = (remaining: number): string => '... ' + remaining + ' more item' + (remaining > 1 ? 's' : '');

export const hexBytes = (bytes: Uint8Array, max: number): string => {
  const length = bytes.length;
  const shown = length > max ? max : length;
  let str = '';
  for (let i = 0; i < shown; i++) str += (i ? ' ' : '') + (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  const remaining = length - shown;
  return remaining > 0 ? str + ' ... ' + remaining + ' more byte' + (remaining > 1 ? 's' : '') : str;
};

/** `getClassBase()` of `lib/internal/util/inspect.js`. */
export const classBase = (value: Function, constructor: string | null, tag: string): string => {
  const name = (hasOwn.call(value, 'name') && value.name) || '(anonymous)';
  let base = 'class ' + name;
  if (constructor !== 'Function' && constructor !== null) base += ' [' + constructor + ']';
  if (tag !== '' && constructor !== tag) base += ' [' + tag + ']';
  if (constructor === null) base += ' extends [null prototype]';
  else {
    const superName = Object.getPrototypeOf(value).name;
    if (superName) base += ' extends ' + superName;
  }
  return '[' + base + ']';
};

const CLASS_REG = /^(\s+[^(]*?)\s*{/;
const COMMENTS_REG = /(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g;
const BOXED: Record<string, Getter> = {
  '[object Number]': Number.prototype.valueOf,
  '[object String]': String.prototype.valueOf,
  '[object Boolean]': Boolean.prototype.valueOf,
  '[object BigInt]': BigInt.prototype.valueOf,
  '[object Symbol]': Symbol.prototype.valueOf,
};

// TODO: a null-prototype async or generator function reads as `[Function]`; Node tells them apart internally.
/** `getFunctionBase()` of `lib/internal/util/inspect.js`. */
export const functionBase = (
  value: Function,
  constructor: string | null,
  tag: string,
  formatName: (name: unknown) => string,
): string => {
  const source = Function.prototype.toString.call(value);
  if (source.startsWith('class') && source.endsWith('}')) {
    const slice = source.slice(5, -1);
    const bracket = slice.indexOf('{');
    if (
      bracket !== -1 &&
      (slice.slice(0, bracket).indexOf('(') === -1 || CLASS_REG.test(slice.replace(COMMENTS_REG, '')))
    )
      return classBase(value, constructor, tag);
  }
  const brand = objectToString.call(value);
  let type = brand.indexOf('GeneratorFunction') === -1 ? 'Function' : 'GeneratorFunction';
  if (brand.indexOf('Async') !== -1) type = 'Async' + type;
  let base = '[' + type;
  if (constructor === null) base += ' (null prototype)';
  const name = value.name;
  base += name === '' ? ' (anonymous)' : ': ' + (typeof name === 'string' ? name : formatName(name));
  base += ']';
  if (constructor !== type && constructor !== null) base += ' ' + constructor;
  if (tag !== '' && constructor !== tag) base += ' [' + tag + ']';
  return base;
};

/** `getBoxedBase()` of `lib/internal/util/inspect.js`. */
export const boxedBase = (
  value: any,
  keys: Key[],
  constructor: string | null,
  tag: string,
  indentation: number,
): string | undefined => {
  const brand = objectToString.call(value);
  const valueOf = BOXED[brand];
  if (valueOf === undefined) return;
  let primitive: unknown;
  try {
    primitive = valueOf.call(value);
  } catch {
    return;
  }
  const type = brand.slice(8, -1);
  if (type === 'String') keys.splice(0, (primitive as string).length);
  let base = '[' + type;
  if (type !== constructor) base += constructor === null ? ' (null prototype)' : ' (' + constructor + ')';
  base += ': ' + formatPrimitive(primitive, indentation) + ']';
  if (tag !== '' && tag !== constructor) base += ' [' + tag + ']';
  return base;
};
