import {CONST, ERROR, MAJOR} from './constants';
import {decodeF16} from '../../util/buffers/f16';
import {JsonPackExtension} from '../JsonPackExtension';
import {JsonPackValue} from '../JsonPackValue';
import {Reader} from '../../util/buffers/Reader';
import sharedCachedUtf8Decoder from '../../util/buffers/utf8/sharedCachedUtf8Decoder';
import type {CachedUtf8Decoder} from '../../util/buffers/utf8/CachedUtf8Decoder';
import type {IReader, IReaderResettable} from '../../util/buffers';
import type {BinaryJsonDecoder, PackValue} from '../types';

export class CborDecoderBase<R extends IReader & IReaderResettable = IReader & IReaderResettable>
  implements BinaryJsonDecoder
{
  public constructor(
    public reader: R = new Reader() as any,
    protected readonly keyDecoder: CachedUtf8Decoder = sharedCachedUtf8Decoder,
  ) {}

  public read(uint8: Uint8Array): PackValue {
    this.reader.reset(uint8);
    return this.val() as PackValue;
  }

  /** @deprecated */
  public decode(uint8: Uint8Array): unknown {
    this.reader.reset(uint8);
    return this.val();
  }

  // -------------------------------------------------------- Any value reading

  public val(): unknown {
    const reader = this.reader;
    const octet = reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major < MAJOR.ARR) {
      if (major < MAJOR.BIN) return major === MAJOR.UIN ? this.readUint(minor) : this.readNint(minor);
      else return major === MAJOR.BIN ? this.readBin(minor) : this.readStr(minor);
    } else {
      if (major < MAJOR.TAG) return major === MAJOR.ARR ? this.readArr(minor) : this.readObj(minor);
      else return major === MAJOR.TAG ? this.readTag(minor) : this.readTkn(minor);
    }
  }

  public readAnyRaw(octet: number): unknown {
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major < MAJOR.ARR) {
      if (major < MAJOR.BIN) return major === MAJOR.UIN ? this.readUint(minor) : this.readNint(minor);
      else return major === MAJOR.BIN ? this.readBin(minor) : this.readStr(minor);
    } else {
      if (major < MAJOR.TAG) return major === MAJOR.ARR ? this.readArr(minor) : this.readObj(minor);
      else return major === MAJOR.TAG ? this.readTag(minor) : this.readTkn(minor);
    }
  }

  public readMinorLen(minor: number): number {
    if (minor < 24) return minor;
    switch (minor) {
      case 24:
        return this.reader.u8();
      case 25:
        return this.reader.u16();
      case 26:
        return this.reader.u32();
      case 27:
        return Number(this.reader.u64());
      case 31:
        return -1;
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  // ----------------------------------------------------- Unsigned int reading

  public readUint(minor: number): number | bigint {
    if (minor < 25) {
      return minor === 24 ? this.reader.u8() : minor;
    } else {
      if (minor < 27) {
        return minor === 25 ? this.reader.u16() : this.reader.u32();
      } else {
        const num = this.reader.u64();
        return num > CONST.MAX_UINT ? num : Number(num);
      }
    }
  }

  // ----------------------------------------------------- Negative int reading

  public readNint(minor: number): number | bigint {
    if (minor < 25) {
      return minor === 24 ? -this.reader.u8() - 1 : -minor - 1;
    } else {
      if (minor < 27) {
        return minor === 25 ? -this.reader.u16() - 1 : -this.reader.u32() - 1;
      } else {
        const num = this.reader.u64();
        return num > CONST.MAX_UINT - 1 ? -num - BigInt(1) : -Number(num) - 1;
      }
    }
  }

  // ----------------------------------------------------------- Binary reading

  public readBin(minor: number): Uint8Array {
    const reader = this.reader;
    if (minor <= 23) return reader.buf(minor);
    switch (minor) {
      case 24:
        return reader.buf(reader.u8());
      case 25:
        return reader.buf(reader.u16());
      case 26:
        return reader.buf(reader.u32());
      case 27:
        return reader.buf(Number(reader.u64()));
      case 31: {
        let size = 0;
        const list: Uint8Array[] = [];
        while (this.reader.peak() !== CONST.END) {
          const uint8 = this.readBinChunk();
          size += uint8.length;
          list.push(uint8);
        }
        this.reader.x++;
        const res = new Uint8Array(size);
        let offset = 0;
        const length = list.length;
        for (let i = 0; i < length; i++) {
          const arr = list[i];
          res.set(arr, offset);
          offset += arr.length;
        }
        return res;
      }
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  public readBinChunk(): Uint8Array {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.BIN) throw ERROR.UNEXPECTED_BIN_CHUNK_MAJOR;
    if (minor > 27) throw ERROR.UNEXPECTED_BIN_CHUNK_MINOR;
    return this.readBin(minor);
  }

  // ----------------------------------------------------------- String reading

  public readAsStr(): string {
    const reader = this.reader;
    const octet = reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.STR) throw ERROR.UNEXPECTED_STR_MAJOR;
    return this.readStr(minor);
  }

  public readStr(minor: number): string {
    const reader = this.reader;
    if (minor <= 23) return reader.utf8(minor);
    switch (minor) {
      case 24:
        return reader.utf8(reader.u8());
      case 25:
        return reader.utf8(reader.u16());
      case 26:
        return reader.utf8(reader.u32());
      case 27:
        return reader.utf8(Number(reader.u64()));
      case 31: {
        let str = '';
        while (reader.peak() !== CONST.END) str += this.readStrChunk();
        this.reader.x++;
        return str;
      }
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  public readStrLen(minor: number): number {
    if (minor <= 23) return minor;
    switch (minor) {
      case 24:
        return this.reader.u8();
      case 25:
        return this.reader.u16();
      case 26:
        return this.reader.u32();
      case 27:
        return Number(this.reader.u64());
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  public readStrChunk(): string {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.STR) throw ERROR.UNEXPECTED_STR_CHUNK_MAJOR;
    if (minor > 27) throw ERROR.UNEXPECTED_STR_CHUNK_MINOR;
    return this.readStr(minor);
  }

  // ------------------------------------------------------------ Array reading

  public readArr(minor: number): unknown[] {
    const length = this.readMinorLen(minor);
    if (length >= 0) return this.readArrRaw(length);
    return this.readArrIndef();
  }

  public readArrRaw(length: number): unknown[] {
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) arr.push(this.val());
    return arr;
  }

  public readArrIndef(): unknown[] {
    const arr: unknown[] = [];
    while (this.reader.peak() !== CONST.END) arr.push(this.val());
    this.reader.x++;
    return arr;
  }

  // ----------------------------------------------------------- Object reading

  public readObj(minor: number): Record<string, unknown> {
    if (minor < 28) {
      let length = minor;
      switch (minor) {
        case 24:
          length = this.reader.u8();
          break;
        case 25:
          length = this.reader.u16();
          break;
        case 26:
          length = this.reader.u32();
          break;
        case 27:
          length = Number(this.reader.u64());
          break;
      }
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < length; i++) {
        const key = this.key();
        if (key === '__proto__') throw ERROR.UNEXPECTED_OBJ_KEY;
        const value = this.val();
        obj[key] = value;
      }
      return obj;
    } else if (minor === 31) return this.readObjIndef();
    else throw ERROR.UNEXPECTED_MINOR;
  }

  /** Remove this? */
  public readObjRaw(length: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < length; i++) {
      const key = this.key();
      const value = this.val();
      obj[key] = value;
    }
    return obj;
  }

  public readObjIndef(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (this.reader.peak() !== CONST.END) {
      const key = this.key();
      if (this.reader.peak() === CONST.END) throw ERROR.UNEXPECTED_OBJ_BREAK;
      const value = this.val();
      obj[key] = value;
    }
    this.reader.x++;
    return obj;
  }

  public key(): string {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.STR) return String(this.readAnyRaw(octet));
    const length = this.readStrLen(minor);
    if (length > 31) return this.reader.utf8(length);
    const key = this.keyDecoder.decode(this.reader.uint8, this.reader.x, length);
    this.reader.skip(length);
    return key;
  }

  // -------------------------------------------------------------- Tag reading

  public readTag(minor: number): JsonPackExtension<unknown> | unknown {
    if (minor <= 23) return this.readTagRaw(minor);
    switch (minor) {
      case 24:
        return this.readTagRaw(this.reader.u8());
      case 25:
        return this.readTagRaw(this.reader.u16());
      case 26:
        return this.readTagRaw(this.reader.u32());
      case 27:
        return this.readTagRaw(Number(this.reader.u64()));
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  public readTagRaw(tag: number): JsonPackExtension<unknown> | unknown {
    return new JsonPackExtension<unknown>(tag, this.val());
  }

  // ------------------------------------------------------------ Token reading

  public readTkn(minor: number): number | true | false | null | undefined | JsonPackValue<number> {
    switch (minor) {
      case 0xf4 & CONST.MINOR_MASK:
        return false;
      case 0xf5 & CONST.MINOR_MASK:
        return true;
      case 0xf6 & CONST.MINOR_MASK:
        return null;
      case 0xf7 & CONST.MINOR_MASK:
        return undefined;
      case 0xf8 & CONST.MINOR_MASK:
        return new JsonPackValue<number>(this.reader.u8());
      case 0xf9 & CONST.MINOR_MASK:
        return this.f16();
      case 0xfa & CONST.MINOR_MASK:
        return this.reader.f32();
      case 0xfb & CONST.MINOR_MASK:
        return this.reader.f64();
    }
    if (minor <= 23) return new JsonPackValue<number>(minor);
    throw ERROR.UNEXPECTED_MINOR;
  }

  public f16(): number {
    return decodeF16(this.reader.u16());
  }
}
