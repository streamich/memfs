import { Buffer } from './internal/buffer';
import * as errors from './internal/errors';

export type TDataOut = string | Buffer; // Data formats we give back to users.
export type TEncoding = 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'latin1' | 'binary' | 'hex';
export type TEncodingExtended = TEncoding | 'buffer';

export const ENCODING_UTF8: TEncoding = 'utf8';

export function assertEncoding(encoding: string | undefined) {
  if (encoding && !Buffer.isEncoding(encoding)) throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}

export function strToEncoding(str: string, encoding?: TEncodingExtended): TDataOut {
  if (!encoding || encoding === ENCODING_UTF8) return str; // UTF-8
  if (encoding === 'buffer') return new Buffer(str); // `buffer` encoding
  return new Buffer(str).toString(encoding); // Custom encoding
}
