export default (arr: Uint8Array, start: number, length: number): string =>
  Buffer.from(arr)
    .subarray(start, start + length)
    .toString();
