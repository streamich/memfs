import v10 from './v10';

const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;

export default utf8Slice
  ? (buf: Uint8Array, start: number, length: number): string => utf8Slice.call(buf, start, start + length)
  : v10;
