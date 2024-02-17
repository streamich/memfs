const utf8Slice = Buffer.prototype.utf8Slice;
export default (buf: Uint8Array, start: number, length: number): string => utf8Slice.call(buf, start, start + length);
