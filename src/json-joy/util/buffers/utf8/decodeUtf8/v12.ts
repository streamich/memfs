const from = Buffer.from;
export default (arr: Uint8Array, start: number, length: number): string =>
  from(arr)
    .subarray(start, start + length)
    .toString();
