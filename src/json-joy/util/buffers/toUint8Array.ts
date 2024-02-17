export const toUint8Array = (data: unknown): Uint8Array => {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return new Uint8Array(data);
  if (typeof Buffer === 'function') {
    if (Buffer.isBuffer(data)) return data;
    return Buffer.from(data as any);
  }
  throw new Error('UINT8ARRAY_INCOMPATIBLE');
};
