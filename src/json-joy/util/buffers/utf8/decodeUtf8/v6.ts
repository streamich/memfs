const sharedTextDecoder = new TextDecoder();

export default (uint8: Uint8Array, start: number, length: number): string => {
  const stringBytes = uint8.subarray(start, start + length);
  return sharedTextDecoder.decode(stringBytes);
};
