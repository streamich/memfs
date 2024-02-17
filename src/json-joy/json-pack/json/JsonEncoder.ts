import {toBase64Bin} from '../../util/base64/toBase64Bin';
import type {IWriter, IWriterGrowable} from '../../util/buffers';
import type {BinaryJsonEncoder, StreamingBinaryJsonEncoder} from '../types';

export class JsonEncoder implements BinaryJsonEncoder, StreamingBinaryJsonEncoder {
  constructor(public readonly writer: IWriter & IWriterGrowable) {}

  public encode(value: unknown): Uint8Array {
    const writer = this.writer;
    writer.reset();
    this.writeAny(value);
    return writer.flush();
  }

  public writeAny(value: unknown): void {
    switch (typeof value) {
      case 'boolean':
        return this.writeBoolean(value);
      case 'number':
        return this.writeNumber(value as number);
      case 'string':
        return this.writeStr(value);
      case 'object': {
        if (value === null) return this.writeNull();
        const constructor = value.constructor;
        switch (constructor) {
          case Array:
            return this.writeArr(value as unknown[]);
          case Uint8Array:
            return this.writeBin(value as Uint8Array);
          default:
            return this.writeObj(value as Record<string, unknown>);
        }
      }
      default:
        return this.writeNull();
    }
  }

  public writeNull(): void {
    this.writer.u32(0x6e756c6c); // null
  }

  public writeBoolean(bool: boolean): void {
    if (bool) this.writer.u32(0x74727565); // true
    else this.writer.u8u32(0x66, 0x616c7365); // false
  }

  public writeNumber(num: number): void {
    const str = num.toString();
    this.writer.ascii(str);
  }

  public writeInteger(int: number): void {
    this.writeNumber(int >> 0 === int ? int : Math.trunc(int));
  }

  public writeUInteger(uint: number): void {
    this.writeInteger(uint < 0 ? -uint : uint);
  }

  public writeFloat(float: number): void {
    this.writeNumber(float);
  }

  public writeBin(buf: Uint8Array): void {
    const writer = this.writer;
    const length = buf.length;
    writer.ensureCapacity(38 + 3 + (length << 1));
    // Write: "data:application/octet-stream;base64, - 22 64 61 74 61 3a 61 70 70 6c 69 63 61 74 69 6f 6e 2f 6f 63 74 65 74 2d 73 74 72 65 61 6d 3b 62 61 73 65 36 34 2c
    const view = writer.view;
    let x = writer.x;
    view.setUint32(x, 0x22_64_61_74); // "dat
    x += 4;
    view.setUint32(x, 0x61_3a_61_70); // a:ap
    x += 4;
    view.setUint32(x, 0x70_6c_69_63); // plic
    x += 4;
    view.setUint32(x, 0x61_74_69_6f); // atio
    x += 4;
    view.setUint32(x, 0x6e_2f_6f_63); // n/oc
    x += 4;
    view.setUint32(x, 0x74_65_74_2d); // tet-
    x += 4;
    view.setUint32(x, 0x73_74_72_65); // stre
    x += 4;
    view.setUint32(x, 0x61_6d_3b_62); // am;b
    x += 4;
    view.setUint32(x, 0x61_73_65_36); // ase6
    x += 4;
    view.setUint16(x, 0x34_2c); // 4,
    x += 2;
    x = toBase64Bin(buf, 0, length, view, x);
    writer.uint8[x++] = 0x22; // "
    writer.x = x;
  }

  public writeStr(str: string): void {
    const writer = this.writer;
    const length = str.length;
    writer.ensureCapacity(length * 4 + 2);
    if (length < 256) {
      let x = writer.x;
      const uint8 = writer.uint8;
      uint8[x++] = 0x22; // "
      for (let i = 0; i < length; i++) {
        const code = str.charCodeAt(i);
        switch (code) {
          case 34: // "
          case 92: // \
            uint8[x++] = 0x5c; // \
            break;
        }
        if (code < 32 || code > 126) {
          writer.utf8(JSON.stringify(str));
          return;
        } else uint8[x++] = code;
      }
      uint8[x++] = 0x22; // "
      writer.x = x;
      return;
    }
    writer.utf8(JSON.stringify(str));
  }

  public writeAsciiStr(str: string): void {
    const length = str.length;
    const writer = this.writer;
    writer.ensureCapacity(length * 2 + 2);
    const uint8 = writer.uint8;
    let x = writer.x;
    uint8[x++] = 0x22; // "
    for (let i = 0; i < length; i++) {
      const code = str.charCodeAt(i);
      switch (code) {
        case 34: // "
        case 92: // \
          uint8[x++] = 0x5c; // \
          break;
      }
      uint8[x++] = code;
    }
    uint8[x++] = 0x22; // "
    writer.x = x;
  }

  public writeArr(arr: unknown[]): void {
    const writer = this.writer;
    writer.u8(0x5b); // [
    const length = arr.length;
    const last = length - 1;
    for (let i = 0; i < last; i++) {
      this.writeAny(arr[i]);
      writer.u8(0x2c); // ,
    }
    if (last >= 0) this.writeAny(arr[last]);
    writer.u8(0x5d); // ]
  }

  public writeArrSeparator(): void {
    this.writer.u8(0x2c); // ,
  }

  public writeObj(obj: Record<string, unknown>): void {
    const writer = this.writer;
    const keys = Object.keys(obj);
    const length = keys.length;
    if (!length) return writer.u16(0x7b7d); // {}
    writer.u8(0x7b); // {
    for (let i = 0; i < length; i++) {
      const key = keys[i];
      const value = obj[key];
      this.writeStr(key);
      writer.u8(0x3a); // :
      this.writeAny(value);
      writer.u8(0x2c); // ,
    }
    writer.uint8[writer.x - 1] = 0x7d; // }
  }

  public writeObjSeparator(): void {
    this.writer.u8(0x2c); // ,
  }

  public writeObjKeySeparator(): void {
    this.writer.u8(0x3a); // :
  }

  // ------------------------------------------------------- Streaming encoding

  public writeStartStr(): void {
    throw new Error('Method not implemented.');
  }

  public writeStrChunk(str: string): void {
    throw new Error('Method not implemented.');
  }

  public writeEndStr(): void {
    throw new Error('Method not implemented.');
  }

  public writeStartBin(): void {
    throw new Error('Method not implemented.');
  }

  public writeBinChunk(buf: Uint8Array): void {
    throw new Error('Method not implemented.');
  }

  public writeEndBin(): void {
    throw new Error('Method not implemented.');
  }

  public writeStartArr(): void {
    this.writer.u8(0x5b); // [
  }

  public writeArrChunk(item: unknown): void {
    throw new Error('Method not implemented.');
  }

  public writeEndArr(): void {
    this.writer.u8(0x5d); // ]
  }

  public writeStartObj(): void {
    this.writer.u8(0x7b); // {
  }

  public writeObjChunk(key: string, value: unknown): void {
    throw new Error('Method not implemented.');
  }

  public writeEndObj(): void {
    this.writer.u8(0x7d); // }
  }
}
