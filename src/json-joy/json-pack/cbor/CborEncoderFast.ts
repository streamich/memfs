import {Writer} from '../../util/buffers/Writer';
import {CONST, MAJOR_OVERLAY} from './constants';
import type {IWriter, IWriterGrowable} from '../../util/buffers';
import type {BinaryJsonEncoder, StreamingBinaryJsonEncoder, TlvBinaryJsonEncoder} from '../types';
import type {Slice} from '../../util/buffers/Slice';

const isSafeInteger = Number.isSafeInteger;

/**
 * Fast CBOR encoder supports only JSON values. Use regular `CborEncoder` if
 * you need ability to encode all CBOR value types.
 */
export class CborEncoderFast<W extends IWriter & IWriterGrowable = IWriter & IWriterGrowable>
  implements BinaryJsonEncoder, StreamingBinaryJsonEncoder, TlvBinaryJsonEncoder
{
  constructor(public readonly writer: W = new Writer() as any) {}

  public encode(value: unknown): Uint8Array {
    this.writeAny(value);
    return this.writer.flush();
  }

  public encodeToSlice(value: unknown): Slice {
    this.writeAny(value);
    return this.writer.flushSlice();
  }

  public writeAny(value: unknown): void {
    switch (typeof value) {
      case 'number':
        return this.writeNumber(value as number);
      case 'string':
        return this.writeStr(value);
      case 'boolean':
        return this.writer.u8(0xf4 + +value);
      case 'object': {
        if (!value) return this.writer.u8(0xf6);
        const constructor = value.constructor;
        switch (constructor) {
          case Array:
            return this.writeArr(value as unknown[]);
          default:
            return this.writeObj(value as Record<string, unknown>);
        }
      }
    }
  }

  public writeCbor(): void {
    this.writer.u8u16(0xd9, 0xd9f7);
  }

  public writeEnd(): void {
    this.writer.u8(CONST.END);
  }

  public writeNull(): void {
    this.writer.u8(0xf6);
  }

  public writeBoolean(bool: boolean): void {
    if (bool) this.writer.u8(0xf5);
    else this.writer.u8(0xf4);
  }

  public writeNumber(num: number): void {
    if (isSafeInteger(num)) this.writeInteger(num);
    else if (typeof num === 'bigint') this.writeBigInt(num);
    else this.writeFloat(num);
  }

  public writeBigInt(int: bigint): void {
    if (int >= 0) this.writeBigUint(int);
    else this.writeBigSint(int);
  }

  public writeBigUint(uint: bigint): void {
    if (uint <= Number.MAX_SAFE_INTEGER) return this.writeUInteger(Number(uint));
    this.writer.u8u64(0x1b, uint);
  }

  public writeBigSint(int: bigint): void {
    if (int >= Number.MIN_SAFE_INTEGER) return this.encodeNint(Number(int));
    const uint = -BigInt(1) - int;
    this.writer.u8u64(0x3b, uint);
  }

  public writeInteger(int: number): void {
    if (int >= 0) this.writeUInteger(int);
    else this.encodeNint(int);
  }

  public writeUInteger(uint: number): void {
    const writer = this.writer;
    writer.ensureCapacity(9);
    const uint8 = writer.uint8;
    let x = writer.x;
    if (uint <= 23) {
      uint8[x++] = MAJOR_OVERLAY.UIN + uint;
    } else if (uint <= 0xff) {
      uint8[x++] = 0x18;
      uint8[x++] = uint;
    } else if (uint <= 0xffff) {
      uint8[x++] = 0x19;
      writer.view.setUint16(x, uint);
      x += 2;
    } else if (uint <= 0xffffffff) {
      uint8[x++] = 0x1a;
      writer.view.setUint32(x, uint);
      x += 4;
    } else {
      uint8[x++] = 0x1b;
      writer.view.setBigUint64(x, BigInt(uint));
      x += 8;
    }
    writer.x = x;
  }

  /** @deprecated Remove and use `writeNumber` instead. */
  public encodeNumber(num: number): void {
    this.writeNumber(num);
  }

  /** @deprecated Remove and use `writeInteger` instead. */
  public encodeInteger(int: number): void {
    this.writeInteger(int);
  }

  /** @deprecated */
  public encodeUint(uint: number): void {
    this.writeUInteger(uint);
  }

  public encodeNint(int: number): void {
    const uint = -1 - int;
    const writer = this.writer;
    writer.ensureCapacity(9);
    const uint8 = writer.uint8;
    let x = writer.x;
    if (uint < 24) {
      uint8[x++] = MAJOR_OVERLAY.NIN + uint;
    } else if (uint <= 0xff) {
      uint8[x++] = 0x38;
      uint8[x++] = uint;
    } else if (uint <= 0xffff) {
      uint8[x++] = 0x39;
      writer.view.setUint16(x, uint);
      x += 2;
    } else if (uint <= 0xffffffff) {
      uint8[x++] = 0x3a;
      writer.view.setUint32(x, uint);
      x += 4;
    } else {
      uint8[x++] = 0x3b;
      writer.view.setBigUint64(x, BigInt(uint));
      x += 8;
    }
    writer.x = x;
  }

  public writeFloat(float: number): void {
    this.writer.u8f64(0xfb, float);
  }

  public writeBin(buf: Uint8Array): void {
    const length = buf.length;
    this.writeBinHdr(length);
    this.writer.buf(buf, length);
  }

  public writeBinHdr(length: number): void {
    const writer = this.writer;
    if (length <= 23) writer.u8(MAJOR_OVERLAY.BIN + length);
    else if (length <= 0xff) writer.u16((0x58 << 8) + length);
    else if (length <= 0xffff) writer.u8u16(0x59, length);
    else if (length <= 0xffffffff) writer.u8u32(0x5a, length);
    else writer.u8u64(0x5b, length);
  }

  public writeStr(str: string): void {
    const writer = this.writer;
    const length = str.length;
    const maxSize = length * 4;
    writer.ensureCapacity(5 + maxSize);
    const uint8 = writer.uint8;
    let lengthOffset: number = writer.x;
    if (maxSize <= 23) writer.x++;
    else if (maxSize <= 0xff) {
      uint8[writer.x++] = 0x78;
      lengthOffset = writer.x;
      writer.x++;
    } else if (maxSize <= 0xffff) {
      uint8[writer.x++] = 0x79;
      lengthOffset = writer.x;
      writer.x += 2;
    } else {
      uint8[writer.x++] = 0x7a;
      lengthOffset = writer.x;
      writer.x += 4;
    }
    const bytesWritten = writer.utf8(str);
    if (maxSize <= 23) uint8[lengthOffset] = MAJOR_OVERLAY.STR + bytesWritten;
    else if (maxSize <= 0xff) uint8[lengthOffset] = bytesWritten;
    else if (maxSize <= 0xffff) writer.view.setUint16(lengthOffset, bytesWritten);
    else writer.view.setUint32(lengthOffset, bytesWritten);
  }

  public writeStrHdr(length: number): void {
    const writer = this.writer;
    if (length <= 23) writer.u8(MAJOR_OVERLAY.STR + length);
    else if (length <= 0xff) writer.u16((0x78 << 8) + length);
    else if (length <= 0xffff) writer.u8u16(0x79, length);
    else writer.u8u32(0x7a, length);
  }

  public writeAsciiStr(str: string): void {
    this.writeStrHdr(str.length);
    this.writer.ascii(str);
  }

  public writeArr(arr: unknown[]): void {
    const length = arr.length;
    this.writeArrHdr(length);
    for (let i = 0; i < length; i++) this.writeAny(arr[i]);
  }

  public writeArrHdr(length: number): void {
    const writer = this.writer;
    if (length <= 23) writer.u8(MAJOR_OVERLAY.ARR + length);
    else if (length <= 0xff) writer.u16((0x98 << 8) + length);
    else if (length <= 0xffff) writer.u8u16(0x99, length);
    else if (length <= 0xffffffff) writer.u8u32(0x9a, length);
    else writer.u8u64(0x9b, length);
  }

  public writeObj(obj: Record<string, unknown>): void {
    const keys = Object.keys(obj);
    const length = keys.length;
    this.writeObjHdr(length);
    for (let i = 0; i < length; i++) {
      const key = keys[i];
      this.writeStr(key);
      this.writeAny(obj[key]);
    }
  }

  public writeObjHdr(length: number): void {
    const writer = this.writer;
    if (length <= 23) writer.u8(MAJOR_OVERLAY.MAP + length);
    else if (length <= 0xff) writer.u16((0xb8 << 8) + length);
    else if (length <= 0xffff) writer.u8u16(0xb9, length);
    else if (length <= 0xffffffff) writer.u8u32(0xba, length);
    else writer.u8u64(0xbb, length);
  }

  public writeMapHdr(length: number): void {
    this.writeObjHdr(length);
  }

  public writeStartMap(): void {
    this.writer.u8(0xbf);
  }

  public writeTag(tag: number, value: unknown): void {
    this.writeTagHdr(tag);
    this.writeAny(value);
  }

  public writeTagHdr(tag: number): void {
    const writer = this.writer;
    if (tag <= 23) writer.u8(MAJOR_OVERLAY.TAG + tag);
    else if (tag <= 0xff) writer.u16((0xd8 << 8) + tag);
    else if (tag <= 0xffff) writer.u8u16(0xd9, tag);
    else if (tag <= 0xffffffff) writer.u8u32(0xda, tag);
    else writer.u8u64(0xdb, tag);
  }

  public writeTkn(value: number): void {
    const writer = this.writer;
    if (value <= 23) writer.u8(MAJOR_OVERLAY.TKN + value);
    else if (value <= 0xff) writer.u16((0xf8 << 8) + value);
  }

  // ------------------------------------------------------- Streaming encoding

  public writeStartStr(): void {
    this.writer.u8(0x7f);
  }

  public writeStrChunk(str: string): void {
    throw new Error('Not implemented');
  }

  public writeEndStr(): void {
    throw new Error('Not implemented');
  }

  public writeStartBin(): void {
    this.writer.u8(0x5f);
  }

  public writeBinChunk(buf: Uint8Array): void {
    throw new Error('Not implemented');
  }

  public writeEndBin(): void {
    throw new Error('Not implemented');
  }

  public writeStartArr(): void {
    this.writer.u8(0x9f);
  }

  public writeArrChunk(item: unknown): void {
    throw new Error('Not implemented');
  }

  public writeEndArr(): void {
    this.writer.u8(CONST.END);
  }

  public writeStartObj(): void {
    this.writer.u8(0xbf);
  }

  public writeObjChunk(key: string, value: unknown): void {
    throw new Error('Not implemented');
  }

  public writeEndObj(): void {
    this.writer.u8(CONST.END);
  }
}
