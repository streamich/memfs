export default (buf: Uint8Array, start: number, length: number): string =>
  Buffer.prototype.utf8Slice.call(buf, start, start + length);
