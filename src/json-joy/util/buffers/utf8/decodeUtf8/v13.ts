import v10 from './v10';

let decode = v10;

const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;

if (utf8Slice) {
  decode = (buf: Uint8Array, start: number, length: number): string =>
    length <= 10 ? v10(buf, start, length) : utf8Slice.call(buf, start, start + length);
} else {
  const from = hasBuffer ? Buffer.from : null;
  if (from) {
    decode = (buf: Uint8Array, start: number, length: number): string =>
      length < 30
        ? v10(buf, start, length)
        : from(buf)
            .subarray(start, start + length)
            .toString();
  } else if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder();
    decode = (buf: Uint8Array, start: number, length: number): string =>
      length < 150 ? v10(buf, start, length) : decoder.decode(buf.subarray(start, start + length));
  }
}

export default decode;
