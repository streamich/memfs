export const bufferToUint8Array = (buf: Buffer): Uint8Array => new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
