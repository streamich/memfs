import {Slice} from './Slice';
import {IWriterGrowable, IWriter} from './types';

const EMPTY_UINT8 = new Uint8Array([]);
const EMPTY_VIEW = new DataView(EMPTY_UINT8.buffer);

const hasBuffer = typeof Buffer === 'function';
const utf8Write = hasBuffer
  ? (Buffer.prototype.utf8Write as (this: Uint8Array, str: string, pos: number, maxLength: number) => number)
  : null;
const from = hasBuffer ? Buffer.from : null;
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * Encoder class provides an efficient way to encode binary data. It grows the
 * internal memory buffer automatically as more space is required. It is useful
 * in cases when it is not known in advance the size of memory needed.
 */
export class Writer implements IWriter, IWriterGrowable {
  /** @ignore */
  public uint8: Uint8Array;
  /** @ignore */
  public view: DataView = EMPTY_VIEW;
  /** @ignore */
  public x0: number = 0;
  /** @ignore */
  public x: number = 0;
  protected size: number;

  /**
   * @param allocSize Number of bytes to allocate at a time when buffer ends.
   */
  constructor(public allocSize: number = 64 * 1024) {
    this.uint8 = new Uint8Array(allocSize);
    this.size = allocSize;
    this.view = new DataView(this.uint8.buffer);
  }

  /** @ignore */
  protected grow(size: number) {
    const x0 = this.x0;
    const x = this.x;
    const oldUint8 = this.uint8;
    const newUint8 = new Uint8Array(size);
    const view = new DataView(newUint8.buffer);
    const activeSlice = oldUint8.subarray(x0, x);
    newUint8.set(activeSlice, 0);
    this.x = x - x0;
    this.x0 = 0;
    this.uint8 = newUint8;
    this.size = size;
    this.view = view;
  }

  /**
   * Make sure the internal buffer has enough space to write the specified number
   * of bytes, otherwise resize the internal buffer to accommodate for more size.
   *
   * @param capacity Number of bytes.
   */
  public ensureCapacity(capacity: number) {
    const byteLength = this.size;
    const remaining = byteLength - this.x;
    if (remaining < capacity) {
      const total = byteLength - this.x0;
      const required = capacity - remaining;
      const totalRequired = total + required;
      this.grow(totalRequired <= this.allocSize ? this.allocSize : totalRequired * 2);
    }
  }

  /** @todo Consider renaming to "skip"? */
  public move(capacity: number) {
    this.ensureCapacity(capacity);
    this.x += capacity;
  }

  public reset() {
    this.x0 = this.x;
  }

  /**
   * Allocates a new {@link ArrayBuffer}, useful when the underlying
   * {@link ArrayBuffer} cannot be shared between threads.
   *
   * @param size Size of memory to allocate.
   */
  public newBuffer(size: number) {
    const uint8 = (this.uint8 = new Uint8Array(size));
    this.size = size;
    this.view = new DataView(uint8.buffer);
    this.x = this.x0 = 0;
  }

  /**
   * @returns Encoded memory buffer contents.
   */
  public flush(): Uint8Array {
    const result = this.uint8.subarray(this.x0, this.x);
    this.x0 = this.x;
    return result;
  }

  public flushSlice(): Slice {
    const slice = new Slice(this.uint8, this.view, this.x0, this.x);
    this.x0 = this.x;
    return slice;
  }

  public u8(char: number) {
    this.ensureCapacity(1);
    this.uint8[this.x++] = char;
  }

  public u16(word: number) {
    this.ensureCapacity(2);
    this.view.setUint16(this.x, word);
    this.x += 2;
  }

  public u32(dword: number) {
    this.ensureCapacity(4);
    this.view.setUint32(this.x, dword);
    this.x += 4;
  }

  public i32(dword: number) {
    this.ensureCapacity(4);
    this.view.setInt32(this.x, dword);
    this.x += 4;
  }

  public u64(qword: number | bigint) {
    this.ensureCapacity(8);
    this.view.setBigUint64(this.x, BigInt(qword));
    this.x += 8;
  }

  public f64(float: number) {
    this.ensureCapacity(8);
    this.view.setFloat64(this.x, float);
    this.x += 8;
  }

  public u8u16(u8: number, u16: number) {
    this.ensureCapacity(3);
    let x = this.x;
    this.uint8[x++] = u8;
    this.uint8[x++] = u16 >>> 8;
    this.uint8[x++] = u16 & 0xff;
    this.x = x;
  }

  public u8u32(u8: number, u32: number) {
    this.ensureCapacity(5);
    let x = this.x;
    this.uint8[x++] = u8;
    this.view.setUint32(x, u32);
    this.x = x + 4;
  }

  public u8u64(u8: number, u64: number | bigint) {
    this.ensureCapacity(9);
    let x = this.x;
    this.uint8[x++] = u8;
    this.view.setBigUint64(x, BigInt(u64));
    this.x = x + 8;
  }

  public u8f32(u8: number, f32: number) {
    this.ensureCapacity(5);
    let x = this.x;
    this.uint8[x++] = u8;
    this.view.setFloat32(x, f32);
    this.x = x + 4;
  }

  public u8f64(u8: number, f64: number) {
    this.ensureCapacity(9);
    let x = this.x;
    this.uint8[x++] = u8;
    this.view.setFloat64(x, f64);
    this.x = x + 8;
  }

  public buf(buf: Uint8Array, length: number): void {
    this.ensureCapacity(length);
    const x = this.x;
    this.uint8.set(buf, x);
    this.x = x + length;
  }

  /**
   * Encodes string as UTF-8. You need to call .ensureCapacity(str.length * 4)
   * before calling
   *
   * @param str String to encode as UTF-8.
   * @returns The number of bytes written
   */
  public utf8(str: string): number {
    const maxLength = str.length * 4;
    if (maxLength < 168) return this.utf8Native(str);
    if (utf8Write) {
      const writeLength = utf8Write.call(this.uint8, str, this.x, maxLength);
      this.x += writeLength;
      return writeLength;
    } else if (from) {
      const uint8 = this.uint8;
      const offset = uint8.byteOffset + this.x;
      const buf = from(uint8.buffer).subarray(offset, offset + maxLength);
      const writeLength = buf.write(str, 0, maxLength, 'utf8');
      this.x += writeLength;
      return writeLength;
    } else if (maxLength > 1024 && textEncoder) {
      const writeLength = textEncoder!.encodeInto(str, this.uint8.subarray(this.x, this.x + maxLength)).written!;
      this.x += writeLength;
      return writeLength;
    }
    return this.utf8Native(str);
  }

  public utf8Native(str: string): number {
    const length = str.length;
    const uint8 = this.uint8;
    let offset = this.x;
    let pos = 0;
    while (pos < length) {
      let value = str.charCodeAt(pos++);
      if ((value & 0xffffff80) === 0) {
        uint8[offset++] = value;
        continue;
      } else if ((value & 0xfffff800) === 0) {
        uint8[offset++] = ((value >> 6) & 0x1f) | 0xc0;
      } else {
        if (value >= 0xd800 && value <= 0xdbff) {
          if (pos < length) {
            const extra = str.charCodeAt(pos);
            if ((extra & 0xfc00) === 0xdc00) {
              pos++;
              value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
            }
          }
        }
        if ((value & 0xffff0000) === 0) {
          uint8[offset++] = ((value >> 12) & 0x0f) | 0xe0;
          uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
        } else {
          uint8[offset++] = ((value >> 18) & 0x07) | 0xf0;
          uint8[offset++] = ((value >> 12) & 0x3f) | 0x80;
          uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
        }
      }
      uint8[offset++] = (value & 0x3f) | 0x80;
    }
    const writeLength = offset - this.x;
    this.x = offset;
    return writeLength;
  }

  public ascii(str: string): void {
    const length = str.length;
    this.ensureCapacity(length);
    const uint8 = this.uint8;
    let x = this.x;
    let pos = 0;
    while (pos < length) uint8[x++] = str.charCodeAt(pos++);
    this.x = x;
  }
}
