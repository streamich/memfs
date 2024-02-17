import {hasBuffer} from './constants';
import {createToBase64} from './createToBase64';

const encodeSmall = createToBase64();

export const toBase64 = !hasBuffer
  ? (uint8: Uint8Array) => encodeSmall(uint8, uint8.length)
  : (uint8: Uint8Array): string => {
      const length = uint8.length;
      if (length <= 48) return encodeSmall(uint8, length);
      return Buffer.from(uint8).toString('base64');
    };
