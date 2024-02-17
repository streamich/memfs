export const isUint8Array =
  typeof Buffer === 'function'
    ? (x: unknown): x is Uint8Array => x instanceof Uint8Array || Buffer.isBuffer(x)
    : (x: unknown): x is Uint8Array => x instanceof Uint8Array;
