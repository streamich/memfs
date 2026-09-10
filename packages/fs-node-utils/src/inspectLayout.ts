export const BREAK_LENGTH = 80;
export const MAX_ARRAY_LENGTH = 100;

export const enum Kind {
  Object = 0,
  ArrayItem = 1,
  ArrayExtras = 2,
}

export interface Ctx {
  depth: number;
  indentationLvl: number;
  currentDepth: number;
  seen: unknown[];
  circular: Map<unknown, number> | undefined;
}

const join = (output: string[], separator: string): string => {
  let str = '';
  const length = output.length;
  for (let i = 0; i < length; i++) str += (i ? separator : '') + output[i];
  return str;
};

// TODO: widths are UTF-16 lengths, Node measures wide and zero-width characters with `getStringWidth`.
const groupArrayElements = (ctx: Ctx, output: string[], value: any): string[] => {
  let totalLength = 0;
  let maxLength = 0;
  let outputLength = output.length;
  if (MAX_ARRAY_LENGTH < output.length) outputLength--;
  const dataLen: number[] = [];
  for (let i = 0; i < outputLength; i++) {
    const len = output[i].length;
    dataLen.push(len);
    totalLength += len + 2;
    if (maxLength < len) maxLength = len;
  }
  const actualMax = maxLength + 2;
  if (actualMax * 3 + ctx.indentationLvl >= BREAK_LENGTH || (totalLength / actualMax <= 5 && maxLength > 6))
    return output;
  const averageBias = Math.sqrt(actualMax - totalLength / output.length);
  const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
  const columns = Math.min(
    Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax),
    Math.floor((BREAK_LENGTH - ctx.indentationLvl) / actualMax),
    12,
    15,
  );
  if (columns <= 1) return output;
  const maxLineLength: number[] = [];
  for (let i = 0; i < columns; i++) {
    let lineMaxLength = 0;
    for (let j = i; j < output.length; j += columns) if (dataLen[j] > lineMaxLength) lineMaxLength = dataLen[j];
    maxLineLength.push(lineMaxLength + 2);
  }
  let padStart = value !== undefined;
  for (let i = 0; padStart && i < output.length; i++)
    if (typeof value[i] !== 'number' && typeof value[i] !== 'bigint') padStart = false;
  const grouped: string[] = [];
  for (let i = 0; i < outputLength; i += columns) {
    const max = Math.min(i + columns, outputLength);
    let str = '';
    let j = i;
    for (; j < max - 1; j++) {
      const cell = output[j] + ', ';
      str += padStart ? cell.padStart(maxLineLength[j - i], ' ') : cell.padEnd(maxLineLength[j - i], ' ');
    }
    str += padStart ? output[j].padStart(maxLineLength[j - i] - 2, ' ') : output[j];
    grouped.push(str);
  }
  if (MAX_ARRAY_LENGTH < output.length) grouped.push(output[outputLength]);
  return grouped;
};

const isBelowBreakLength = (output: string[], start: number, base: string): boolean => {
  let totalLength = output.length + start;
  if (totalLength + output.length > BREAK_LENGTH) return false;
  for (let i = 0; i < output.length; i++) {
    totalLength += output[i].length;
    if (totalLength > BREAK_LENGTH) return false;
  }
  return base === '' || base.indexOf('\n') === -1;
};

/** `reduceToSingleString()` of `lib/internal/util/inspect.js`, `compact: 3`. */
export const reduceToSingleString = (
  ctx: Ctx,
  output: string[],
  base: string,
  braces: string[],
  kind: Kind,
  recurseTimes: number,
  value: unknown,
): string => {
  const entries = output.length;
  if (kind === Kind.ArrayExtras && entries > 6) output = groupArrayElements(ctx, output, value);
  const head = base ? base + ' ' + braces[0] : braces[0];
  if (ctx.currentDepth - recurseTimes < 3 && entries === output.length) {
    const start = output.length + ctx.indentationLvl + braces[0].length + base.length + 10;
    if (isBelowBreakLength(output, start, base)) {
      const joined = join(output, ', ');
      if (joined.indexOf('\n') === -1) return head + ' ' + joined + ' ' + braces[1];
    }
  }
  const indentation = '\n' + ' '.repeat(ctx.indentationLvl);
  return head + indentation + '  ' + join(output, ',' + indentation + '  ') + indentation + braces[1];
};
