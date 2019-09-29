import { Buffer } from 'buffer';

function bufferV0P12Ponyfill(arg0: any, ...args: any): Buffer {
  return new Buffer(arg0, ...args);
}

const bufferAllocUnsafe = Buffer.allocUnsafe || bufferV0P12Ponyfill;
const bufferFrom = Buffer.from || bufferV0P12Ponyfill;

export { Buffer, bufferAllocUnsafe, bufferFrom };
