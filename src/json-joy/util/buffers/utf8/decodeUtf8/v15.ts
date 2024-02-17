import v10 from './v10';

const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
const from = hasBuffer ? Buffer.from : null;

export default (buf: Uint8Array, start: number, length: number): string => {
  const end = start + length;
  return length > 8
    ? utf8Slice
      ? utf8Slice.call(buf, start, end)
      : from
      ? from(buf).subarray(start, end).toString('utf8')
      : v10(buf, start, length)
    : v10(buf, start, length);
};
