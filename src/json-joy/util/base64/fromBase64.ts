import {bufferToUint8Array} from '../buffers/bufferToUint8Array';
import {hasBuffer} from './constants';
import {createFromBase64} from './createFromBase64';

const fromBase64Cpp = hasBuffer ? (encoded: string) => bufferToUint8Array(Buffer.from(encoded, 'base64')) : null;
const fromBase64Native = createFromBase64();

export const fromBase64 = !fromBase64Cpp
  ? fromBase64Native
  : (encoded: string): Uint8Array => (encoded.length > 48 ? fromBase64Cpp(encoded) : fromBase64Native(encoded));
