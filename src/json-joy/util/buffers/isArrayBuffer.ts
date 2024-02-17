export const isArrayBuffer = (value: unknown): value is ArrayBuffer => {
  return value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]';
};
