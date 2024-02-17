export default (arr: Uint8Array, start: number, length: number): string =>
  Buffer.from(arr)
    .slice(start, start + length)
    .toString();
