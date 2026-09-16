import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { invalidArgValue } from './argErrors';
import { TDataOut, TEncodingExtended } from './types';

export const ENCODING_UTF8: BufferEncoding = 'utf8';

export function assertEncoding(encoding: string | undefined) {
  if (encoding && !Buffer.isEncoding(encoding)) throw invalidArgValue('encoding', encoding, 'is invalid encoding');
}

export function strToEncoding(str: string, encoding?: TEncodingExtended): TDataOut {
  if (!encoding || encoding === ENCODING_UTF8) return str; // UTF-8
  if (encoding === 'buffer') return new Buffer(str); // `buffer` encoding
  return new Buffer(str).toString(encoding); // Custom encoding
}
