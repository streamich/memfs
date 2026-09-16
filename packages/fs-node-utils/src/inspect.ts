import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { escapeString, formatNumber, formatPrimitive, quoteString } from './inspectPrimitive';
import { type Ctx, Kind, MAX_ARRAY_LENGTH, reduceToSingleString } from './inspectLayout';
import {
  type Key,
  arrayBufferByteLength,
  boxedBase,
  constructorName,
  dataViewBuffer,
  functionBase,
  getOwn,
  hasBrand,
  hasOwn,
  hexBytes,
  isEnumerable,
  isIndex,
  isInstance,
  mapSize,
  moreItems,
  nonIndexKeys,
  objectToString,
  ownKeys,
  prefixOf,
  regExpSource,
  setSize,
  sharedArrayBufferByteLength,
  typedArrayLength,
  typedArrayTag,
} from './inspectBrand';

const INSPECT_MAX_BYTES = 50;
const KEY_REG = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

type Formatter = (ctx: Ctx, value: any, recurseTimes: number) => string[];

const formatProperty = (
  ctx: Ctx,
  value: any,
  recurseTimes: number,
  key: Key,
  kind: Kind,
  desc?: PropertyDescriptor,
): string => {
  const descriptor = desc || getOwn(value, key)!;
  let str: string;
  if (descriptor.value !== undefined) {
    ctx.indentationLvl += 2;
    str = formatValue(ctx, descriptor.value, recurseTimes);
    ctx.indentationLvl -= 2;
  } else if (descriptor.get !== undefined) str = descriptor.set !== undefined ? '[Getter/Setter]' : '[Getter]';
  else str = descriptor.set !== undefined ? '[Setter]' : 'undefined';
  if (kind === Kind.ArrayItem) return str;
  let name: string;
  if (typeof key === 'symbol') name = escapeString(key.toString(), 39);
  else if (KEY_REG.test('' + key)) name = key === '__proto__' ? "['__proto__']" : '' + key;
  else name = quoteString('' + key);
  if (descriptor.enumerable === false) name = '[' + name + ']';
  return name + ': ' + str;
};

const formatExtra = (ctx: Ctx, value: any, recurseTimes: number, key: string): string => {
  let item: unknown;
  ctx.indentationLvl += 2;
  try {
    item = value[key];
  } catch {
    // Node leaves the indentation of the failed read in place, then retries on `buffer`
    ctx.indentationLvl += 2;
    item = value.buffer[key];
  }
  const str = formatValue(ctx, item, recurseTimes);
  ctx.indentationLvl -= 2;
  return '[' + key + ']: ' + str;
};

const formatSparseArray = (
  ctx: Ctx,
  value: any[],
  recurseTimes: number,
  maxLength: number,
  output: string[],
  i: number,
): string[] => {
  const keys = Object.keys(value);
  let index = i;
  for (; i < keys.length && output.length < maxLength; i++) {
    const key = keys[i];
    const tmp = +key;
    if (tmp > 4294967294) break;
    if ('' + index !== key) {
      if (!isIndex(key)) break;
      const empty = tmp - index;
      output.push('<' + empty + ' empty item' + (empty > 1 ? 's' : '') + '>');
      index = tmp;
      if (output.length === maxLength) break;
    }
    output.push(formatProperty(ctx, value, recurseTimes, key, Kind.ArrayItem));
    index++;
  }
  const remaining = value.length - index;
  if (output.length !== maxLength) {
    if (remaining > 0) output.push('<' + remaining + ' empty item' + (remaining > 1 ? 's' : '') + '>');
  } else if (remaining > 0) output.push(moreItems(remaining));
  return output;
};

const formatArray: Formatter = (ctx, value, recurseTimes) => {
  const length = value.length;
  const max = length < MAX_ARRAY_LENGTH ? length : MAX_ARRAY_LENGTH;
  const output: string[] = [];
  for (let i = 0; i < max; i++) {
    const desc = getOwn(value, i);
    if (desc === undefined) return formatSparseArray(ctx, value, recurseTimes, max, output, i);
    output.push(formatProperty(ctx, value, recurseTimes, i, Kind.ArrayItem, desc));
  }
  if (length > max) output.push(moreItems(length - max));
  return output;
};

const formatTypedArray: Formatter = (ctx, value) => {
  const length = typedArrayLength.call(value);
  const max = length < MAX_ARRAY_LENGTH ? length : MAX_ARRAY_LENGTH;
  const output: string[] = [];
  const bigint = length > 0 && typeof value[0] !== 'number';
  for (let i = 0; i < max; i++) output.push(bigint ? value[i] + 'n' : formatNumber(value[i]));
  if (length > max) output.push(moreItems(length - max));
  return output;
};

const formatSet: Formatter = (ctx, value, recurseTimes) => {
  const length = setSize.call(value);
  const max = length < MAX_ARRAY_LENGTH ? length : MAX_ARRAY_LENGTH;
  const output: string[] = [];
  const iterator = Set.prototype.values.call(value);
  ctx.indentationLvl += 2;
  for (let entry = iterator.next(); !entry.done && output.length < max; entry = iterator.next())
    output.push(formatValue(ctx, entry.value, recurseTimes));
  if (length > max) output.push(moreItems(length - max));
  ctx.indentationLvl -= 2;
  return output;
};

const formatMap: Formatter = (ctx, value, recurseTimes) => {
  const length = mapSize.call(value);
  const max = length < MAX_ARRAY_LENGTH ? length : MAX_ARRAY_LENGTH;
  const output: string[] = [];
  const iterator = Map.prototype.entries.call(value);
  ctx.indentationLvl += 2;
  for (let entry = iterator.next(); !entry.done && output.length < max; entry = iterator.next())
    output.push(
      formatValue(ctx, entry.value[0], recurseTimes) + ' => ' + formatValue(ctx, entry.value[1], recurseTimes),
    );
  if (length > max) output.push(moreItems(length - max));
  ctx.indentationLvl -= 2;
  return output;
};

const formatArrayBuffer: Formatter = (ctx, value) => {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(value);
  } catch {
    return ['(detached)'];
  }
  return ['[Uint8Contents]: <' + hexBytes(bytes, MAX_ARRAY_LENGTH) + '>'];
};

const noEntries: Formatter = () => [];

const formatRaw = (ctx: Ctx, value: any, recurseTimes: number): string => {
  const constructor = constructorName(value);
  let rawTag: unknown = '';
  try {
    rawTag = value[Symbol.toStringTag];
  } catch {}
  const tag =
    typeof rawTag !== 'string' || (rawTag !== '' && isEnumerable.call(value, Symbol.toStringTag)) ? '' : rawTag;
  let keys: Key[] | undefined;
  let base = '';
  let braces = ['{', '}'];
  let formatter = noEntries;
  let kind = Kind.Object;
  let fallback = 'Object';
  let extraKeys: string[] | undefined;
  if (Symbol.iterator in value || constructor === null) {
    let typed: string | undefined;
    if (Array.isArray(value)) {
      fallback = 'Array';
      keys = nonIndexKeys(value);
      const prefix =
        constructor !== 'Array' || tag !== '' ? prefixOf(constructor, tag, 'Array', '(' + value.length + ')') : '';
      braces = [prefix + '[', ']'];
      if (value.length === 0 && keys.length === 0) return braces[0] + ']';
      kind = Kind.ArrayExtras;
      formatter = formatArray;
    } else if (hasBrand(setSize, value) || hasBrand(mapSize, value)) {
      const isSet = hasBrand(setSize, value);
      const size = isSet ? setSize.call(value) : mapSize.call(value);
      fallback = isSet ? 'Set' : 'Map';
      keys = ownKeys(value);
      const prefix = prefixOf(constructor, tag, fallback, '(' + size + ')');
      if (size === 0 && keys.length === 0) return prefix + '{}';
      braces = [prefix + '{', '}'];
      formatter = isSet ? formatSet : formatMap;
    } else if ((typed = typedArrayTag.call(value)) !== undefined) {
      fallback = typed;
      keys = nonIndexKeys(value);
      const length = typedArrayLength.call(value);
      const prefix = prefixOf(constructor, tag, constructor === null ? typed : '', '(' + length + ')');
      braces = [prefix + '[', ']'];
      if (length === 0 && keys.length === 0) return braces[0] + ']';
      kind = Kind.ArrayExtras;
      formatter = formatTypedArray;
    }
  }
  if (keys === undefined) {
    keys = ownKeys(value);
    if (typeof value === 'function') {
      fallback = 'Function';
      base = functionBase(value, constructor, tag, name => formatValue(ctx, name, 0));
      if (keys.length === 0) return base;
    } else if (constructor === 'Object') {
      if (objectToString.call(value) === '[object Arguments]' && hasOwn.call(value, 'callee'))
        braces[0] = '[Arguments] {';
      else if (tag !== '') braces[0] = prefixOf(constructor, tag, 'Object') + '{';
      if (keys.length === 0) return braces[0] + '}';
    } else if (hasBrand(regExpSource, value)) {
      fallback = 'RegExp';
      const prefix = prefixOf(constructor, tag, 'RegExp');
      base = RegExp.prototype.toString.call(constructor === null ? new RegExp(value) : value);
      if (prefix !== 'RegExp ') base = prefix + base;
      if (keys.length === 0 || recurseTimes > ctx.depth) return base;
    } else if (hasBrand(Date.prototype.getTime, value)) {
      fallback = 'Date';
      const prefix = prefixOf(constructor, tag, 'Date');
      const time = Date.prototype.getTime.call(value);
      base = time !== time ? Date.prototype.toString.call(value) : Date.prototype.toISOString.call(value);
      if (prefix !== 'Date ') base = prefix + base;
      if (keys.length === 0) return base;
    } else if (objectToString.call(value) === '[object Error]' || isInstance(value, Error)) {
      fallback = 'Error';
      // TODO: Node's `formatError` also rewrites the stack when `name`, `message` or `cause` disagree with it.
      const stack = value.stack;
      base =
        typeof stack === 'string' && stack !== ''
          ? stack.replace(/\n/g, '\n' + ' '.repeat(ctx.indentationLvl))
          : '[' + Error.prototype.toString.call(value) + ']';
      if (keys.length === 0) return base;
    } else if (
      hasBrand(arrayBufferByteLength, value) ||
      (sharedArrayBufferByteLength !== undefined && hasBrand(sharedArrayBufferByteLength, value))
    ) {
      fallback = hasBrand(arrayBufferByteLength, value) ? 'ArrayBuffer' : 'SharedArrayBuffer';
      braces[0] = prefixOf(constructor, tag, fallback) + '{';
      formatter = formatArrayBuffer;
      extraKeys = ['byteLength'];
    } else if (hasBrand(dataViewBuffer, value)) {
      fallback = 'DataView';
      braces[0] = prefixOf(constructor, tag, 'DataView') + '{';
      extraKeys = ['byteLength', 'byteOffset', 'buffer'];
    } else {
      const boxed = boxedBase(value, keys, constructor, tag, ctx.indentationLvl);
      if (boxed !== undefined) {
        base = boxed;
        if (keys.length === 0) return base;
      } else {
        // TODO: Promise, WeakMap, WeakSet and objects with a custom inspect, like URL, render differently in Node.
        const style = prefixOf(constructor, tag, constructor === null ? 'Object' : '');
        if (keys.length === 0) return style + '{}';
        braces[0] = style + '{';
      }
    }
  }
  if (recurseTimes > ctx.depth) {
    const name = prefixOf(constructor, tag, constructor === null ? (fallback === tag ? 'Object' : fallback) : '').slice(
      0,
      -1,
    );
    return constructor === null ? name : '[' + name + ']';
  }
  recurseTimes++;
  ctx.seen.push(value);
  ctx.currentDepth = recurseTimes;
  const output = formatter(ctx, value, recurseTimes);
  if (extraKeys !== undefined)
    for (let i = 0; i < extraKeys.length; i++) output.push(formatExtra(ctx, value, recurseTimes, extraKeys[i]));
  for (let i = 0; i < keys.length; i++) output.push(formatProperty(ctx, value, recurseTimes, keys[i], kind));
  const index = ctx.circular === undefined ? undefined : ctx.circular.get(value);
  if (index !== undefined) base = base === '' ? '<ref *' + index + '>' : '<ref *' + index + '> ' + base;
  ctx.seen.pop();
  return reduceToSingleString(ctx, output, base, braces, kind, recurseTimes, value);
};

const formatValue = (ctx: Ctx, value: unknown, recurseTimes: number): string => {
  if (typeof value !== 'object' && typeof value !== 'function') return formatPrimitive(value, ctx.indentationLvl);
  if (value === null) return 'null';
  if (Buffer.isBuffer(value)) return '<' + value.constructor.name + ' ' + hexBytes(value, INSPECT_MAX_BYTES) + '>';
  if (ctx.seen.indexOf(value) !== -1) {
    let circular = ctx.circular;
    if (circular === undefined) ctx.circular = circular = new Map();
    let index = circular.get(value);
    if (index === undefined) {
      index = circular.size + 1;
      circular.set(value, index);
    }
    return '[Circular *' + index + ']';
  }
  // TODO: Node formats a Proxy's target without running its traps, plain JS cannot tell a Proxy apart.
  return formatRaw(ctx, value, recurseTimes);
};

/** `util.inspect(value, { depth })` with Node's other defaults, for error messages. */
export const inspect = (value: unknown, depth: number = 2): string =>
  formatValue({ depth, indentationLvl: 0, currentDepth: 0, seen: [], circular: undefined }, value, 0);
