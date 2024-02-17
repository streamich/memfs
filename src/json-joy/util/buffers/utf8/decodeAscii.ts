const fromCharCode = String.fromCharCode;

/** This code was borrowed form cbor-x under the MIT license. */

// MIT License

// Copyright (c) 2020 Kris Zyp

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export const decodeAscii = (src: Uint8Array, position: number, length: number): string | undefined => {
  const bytes = [];
  for (let i = 0; i < length; i++) {
    const byte = src[position++];
    if (byte & 0x80) return;
    bytes.push(byte);
  }
  return fromCharCode.apply(String, bytes);
};

export const decodeAsciiMax15 = (src: Uint8Array, position: number, length: number): string | undefined => {
  if (length < 4) {
    if (length < 2) {
      if (length === 0) return '';
      else {
        const a = src[position++];
        if ((a & 0x80) > 1) {
          position -= 1;
          return;
        }
        return fromCharCode(a);
      }
    } else {
      const a = src[position++];
      const b = src[position++];
      if ((a & 0x80) > 0 || (b & 0x80) > 0) {
        position -= 2;
        return;
      }
      if (length < 3) return fromCharCode(a, b);
      const c = src[position++];
      if ((c & 0x80) > 0) {
        position -= 3;
        return;
      }
      return fromCharCode(a, b, c);
    }
  } else {
    const a = src[position++];
    const b = src[position++];
    const c = src[position++];
    const d = src[position++];
    if ((a & 0x80) > 0 || (b & 0x80) > 0 || (c & 0x80) > 0 || (d & 0x80) > 0) {
      position -= 4;
      return;
    }
    if (length < 6) {
      if (length === 4) return fromCharCode(a, b, c, d);
      else {
        const e = src[position++];
        if ((e & 0x80) > 0) {
          position -= 5;
          return;
        }
        return fromCharCode(a, b, c, d, e);
      }
    } else if (length < 8) {
      const e = src[position++];
      const f = src[position++];
      if ((e & 0x80) > 0 || (f & 0x80) > 0) {
        position -= 6;
        return;
      }
      if (length < 7) return fromCharCode(a, b, c, d, e, f);
      const g = src[position++];
      if ((g & 0x80) > 0) {
        position -= 7;
        return;
      }
      return fromCharCode(a, b, c, d, e, f, g);
    } else {
      const e = src[position++];
      const f = src[position++];
      const g = src[position++];
      const h = src[position++];
      if ((e & 0x80) > 0 || (f & 0x80) > 0 || (g & 0x80) > 0 || (h & 0x80) > 0) {
        position -= 8;
        return;
      }
      if (length < 10) {
        if (length === 8) return fromCharCode(a, b, c, d, e, f, g, h);
        else {
          const i = src[position++];
          if ((i & 0x80) > 0) {
            position -= 9;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i);
        }
      } else if (length < 12) {
        const i = src[position++];
        const j = src[position++];
        if ((i & 0x80) > 0 || (j & 0x80) > 0) {
          position -= 10;
          return;
        }
        if (length < 11) return fromCharCode(a, b, c, d, e, f, g, h, i, j);
        const k = src[position++];
        if ((k & 0x80) > 0) {
          position -= 11;
          return;
        }
        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
      } else {
        const i = src[position++];
        const j = src[position++];
        const k = src[position++];
        const l = src[position++];
        if ((i & 0x80) > 0 || (j & 0x80) > 0 || (k & 0x80) > 0 || (l & 0x80) > 0) {
          position -= 12;
          return;
        }
        if (length < 14) {
          if (length === 12) return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
          else {
            const m = src[position++];
            if ((m & 0x80) > 0) {
              position -= 13;
              return;
            }
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
          }
        } else {
          const m = src[position++];
          const n = src[position++];
          if ((m & 0x80) > 0 || (n & 0x80) > 0) {
            position -= 14;
            return;
          }
          if (length < 15) return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
          const o = src[position++];
          if ((o & 0x80) > 0) {
            position -= 15;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
        }
      }
    }
  }
};
