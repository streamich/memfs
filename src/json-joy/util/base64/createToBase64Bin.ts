import {alphabet} from './constants';

export const createToBase64Bin = (chars: string = alphabet) => {
  if (chars.length !== 64) throw new Error('chars must be 64 characters long');

  const table = chars.split('').map((c) => c.charCodeAt(0));
  const table2: number[] = [];

  for (const c1 of table) {
    for (const c2 of table) {
      const two = (c1 << 8) + c2;
      table2.push(two);
    }
  }

  return (uint8: Uint8Array, start: number, length: number, dest: DataView, offset: number): number => {
    const extraLength = length % 3;
    const baseLength = length - extraLength;
    for (; start < baseLength; start += 3) {
      const o1 = uint8[start];
      const o2 = uint8[start + 1];
      const o3 = uint8[start + 2];
      const v1 = (o1 << 4) | (o2 >> 4);
      const v2 = ((o2 & 0b1111) << 8) | o3;
      dest.setInt32(offset, (table2[v1] << 16) + table2[v2]);
      offset += 4;
    }
    if (extraLength) {
      if (extraLength === 1) {
        const o1 = uint8[baseLength];
        dest.setInt32(offset, (table2[o1 << 4] << 16) + 0x3d3d);
        return offset + 4;
      } else {
        const o1 = uint8[baseLength];
        const o2 = uint8[baseLength + 1];
        const v1 = (o1 << 4) | (o2 >> 4);
        const v2 = (o2 & 0b1111) << 2;
        dest.setInt32(offset, (table2[v1] << 16) + (table[v2] << 8) + 0x3d);
        return offset + 4;
      }
    }
    return offset;
  };
};
