import {decodeAscii, decodeAsciiMax15} from '../decodeAscii';
import v18 from './v18';

type Decoder = (buf: Uint8Array, start: number, length: number) => string;

const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
const from = hasBuffer ? Buffer.from : null;

const shortDecoder: Decoder = (buf, start, length) => decodeAsciiMax15(buf, start, length) ?? v18(buf, start, length);

const midDecoder: Decoder = (buf, start, length) => decodeAscii(buf, start, length) ?? v18(buf, start, length);

const longDecoder: Decoder = utf8Slice
  ? (buf, start, length) => utf8Slice.call(buf, start, start + length)
  : from
  ? (buf, start, length) =>
      from(buf)
        .subarray(start, start + length)
        .toString('utf8')
  : v18;

const decoder: Decoder = (buf, start, length): string => {
  if (length < 16) return shortDecoder(buf, start, length);
  if (length < 32) return midDecoder(buf, start, length);
  return longDecoder(buf, start, length);
};

export default decoder;
