import {CborEncoder} from './CborEncoder';
import {sort} from '../../util/sort/insertion2';
import {MAJOR_OVERLAY} from './constants';

const objectKeyComparator = (a: string, b: string): number => {
  const len1 = a.length;
  const len2 = b.length;
  return len1 === len2 ? (a > b ? 1 : -1) : len1 - len2;
};

const strHeaderLength = (strSize: number): 1 | 2 | 3 | 5 => {
  if (strSize <= 23) return 1;
  else if (strSize <= 0xff) return 2;
  else if (strSize <= 0xffff) return 3;
  else return 5;
};

export class CborEncoderStable extends CborEncoder {
  public writeObj(obj: Record<string, unknown>): void {
    const keys = Object.keys(obj);
    sort(keys, objectKeyComparator);
    const length = keys.length;
    this.writeObjHdr(length);
    for (let i = 0; i < length; i++) {
      const key = keys[i];
      this.writeStr(key);
      this.writeAny(obj[key]);
    }
  }

  /** @todo This implementation might be even faster than the default one, verify that. */
  public writeStr(str: string): void {
    const writer = this.writer;
    const length = str.length;
    const maxSize = length * 4;
    writer.ensureCapacity(5 + maxSize);
    const headerLengthGuess = strHeaderLength(length);
    const x0 = writer.x;
    const x1 = x0 + headerLengthGuess;
    writer.x = x1;
    const bytesWritten = writer.utf8(str);
    const uint8 = writer.uint8;
    const headerLength = strHeaderLength(bytesWritten);
    if (headerLength !== headerLengthGuess) {
      const shift = headerLength - headerLengthGuess;
      uint8.copyWithin(x1 + shift, x1, x1 + bytesWritten);
    }
    switch (headerLength) {
      case 1:
        uint8[x0] = MAJOR_OVERLAY.STR + bytesWritten;
        break;
      case 2:
        uint8[x0] = 0x78;
        uint8[x0 + 1] = bytesWritten;
        break;
      case 3: {
        uint8[x0] = 0x79;
        writer.view.setUint16(x0 + 1, bytesWritten);
        break;
      }
      case 5: {
        uint8[x0] = 0x7a;
        writer.view.setUint32(x0 + 1, bytesWritten);
        break;
      }
    }
    writer.x = x0 + headerLength + bytesWritten;
  }

  public writeUndef(): void {
    this.writeNull();
  }
}
