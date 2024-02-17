/**
 * Validates that the given data is valid UTF-8 text.
 * @param buf Data to check.
 * @returns True if the data is valid UTF-8.
 */
export const isUtf8 = (buf: Uint8Array, from: number, length: number): boolean => {
  const to = from + length;
  while (from < to) {
    const c = buf[from];
    if (c <= 0x7f) {
      from++;
      continue;
    }
    if (c >= 0xc2 && c <= 0xdf) {
      if (buf[from + 1] >> 6 === 2) {
        from += 2;
        continue;
      } else return false;
    }
    const c1 = buf[from + 1];
    if (
      ((c === 0xe0 && c1 >= 0xa0 && c1 <= 0xbf) || (c === 0xed && c1 >= 0x80 && c1 <= 0x9f)) &&
      buf[from + 2] >> 6 === 2
    ) {
      from += 3;
      continue;
    }
    if (((c >= 0xe1 && c <= 0xec) || (c >= 0xee && c <= 0xef)) && c1 >> 6 === 2 && buf[from + 2] >> 6 === 2) {
      from += 3;
      continue;
    }
    if (
      ((c === 0xf0 && c1 >= 0x90 && c1 <= 0xbf) ||
        (c >= 0xf1 && c <= 0xf3 && c1 >> 6 === 2) ||
        (c === 0xf4 && c1 >= 0x80 && c1 <= 0x8f)) &&
      buf[from + 2] >> 6 === 2 &&
      buf[from + 3] >> 6 === 2
    ) {
      from += 4;
      continue;
    }
    return false;
  }
  return true;
};
