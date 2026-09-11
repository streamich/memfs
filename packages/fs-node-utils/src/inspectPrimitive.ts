const MAX_STRING_LENGTH = 10000;

const META: string[] = [];
for (let i = 0; i < 0xa0; i++)
  META.push(i < 0x20 || i > 0x7e ? '\\x' + (i < 0x10 ? '0' : '') + i.toString(16).toUpperCase() : '');
META[8] = '\\b';
META[9] = '\\t';
META[10] = '\\n';
META[12] = '\\f';
META[13] = '\\r';
META[39] = "\\'";
META[92] = '\\\\';

/**
 * The escaping of `strEscape()` in `lib/internal/util/inspect.js`, without the quotes.
 *
 * @param quote Char code of the quote to escape, or -1 for none.
 */
export const escapeString = (str: string, quote: number): string => {
  let result = '';
  let last = 0;
  const length = str.length;
  for (let i = 0; i < length; i++) {
    const point = str.charCodeAt(i);
    if (point === quote || point === 92 || point < 32 || (point > 126 && point < 160)) {
      result += str.slice(last, i) + META[point];
      last = i + 1;
    } else if (point >= 0xd800 && point <= 0xdfff) {
      if (point <= 0xdbff && i + 1 < length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          i++;
          continue;
        }
      }
      result += str.slice(last, i) + '\\u' + point.toString(16);
      last = i + 1;
    }
  }
  return last === 0 ? str : result + str.slice(last);
};

/** `strEscape()` of `lib/internal/util/inspect.js`. */
export const quoteString = (str: string): string => {
  if (str.indexOf("'") === -1) return "'" + escapeString(str, 39) + "'";
  if (str.indexOf('"') === -1) return '"' + escapeString(str, -1) + '"';
  if (str.indexOf('`') === -1 && str.indexOf('${') === -1) return '`' + escapeString(str, -1) + '`';
  return "'" + escapeString(str, 39) + "'";
};

const formatString = (value: string, indentation: number): string => {
  let trailer = '';
  if (value.length > MAX_STRING_LENGTH) {
    const remaining = value.length - MAX_STRING_LENGTH;
    value = value.slice(0, MAX_STRING_LENGTH);
    trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
  }
  const length = value.length;
  if (length <= 16 || length <= 76 - indentation) return quoteString(value) + trailer;
  const separator = ' +\n' + ' '.repeat(indentation + 2);
  let out = '';
  let start = 0;
  let end = value.indexOf('\n');
  while (end !== -1 && end + 1 < length) {
    out += quoteString(value.slice(start, end + 1)) + separator;
    start = end + 1;
    end = value.indexOf('\n', start);
  }
  return out + quoteString(value.slice(start)) + trailer;
};

export const formatNumber = (value: number): string => (Object.is(value, -0) ? '-0' : '' + value);

/** `formatPrimitive()` of `lib/internal/util/inspect.js`. */
export const formatPrimitive = (value: unknown, indentation: number): string => {
  switch (typeof value) {
    case 'string':
      return formatString(value, indentation);
    case 'number':
      return formatNumber(value);
    case 'bigint':
      return value + 'n';
    case 'symbol':
      return value.toString();
    default:
      return '' + value;
  }
};

/** `addNumericalSeparator()` of `lib/internal/errors.js`. */
export const addNumericalSeparator = (val: string): string => {
  let res = '';
  let i = val.length;
  const start = val.charCodeAt(0) === 45 ? 1 : 0;
  for (; i >= start + 4; i -= 3) res = '_' + val.slice(i - 3, i) + res;
  return val.slice(0, i) + res;
};
