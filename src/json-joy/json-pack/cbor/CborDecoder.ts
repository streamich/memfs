import {CONST, ERROR, MAJOR} from './constants';
import {CborDecoderBase} from './CborDecoderBase';
import type {IReader, IReaderResettable} from '../../util/buffers';

export class CborDecoder<
  R extends IReader & IReaderResettable = IReader & IReaderResettable,
> extends CborDecoderBase<R> {
  // ----------------------------------------------------------- Value skipping

  public skipN(n: number): void {
    for (let i = 0; i < n; i++) this.skipAny();
  }
  public skipAny(): void {
    this.skipAnyRaw(this.reader.u8());
  }

  public skipAnyRaw(octet: number): void {
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    switch (major) {
      case MAJOR.UIN:
      case MAJOR.NIN:
        this.skipUNint(minor);
        break;
      case MAJOR.BIN:
        this.skipBin(minor);
        break;
      case MAJOR.STR:
        this.skipStr(minor);
        break;
      case MAJOR.ARR:
        this.skipArr(minor);
        break;
      case MAJOR.MAP:
        this.skipObj(minor);
        break;
      case MAJOR.TKN:
        this.skipTkn(minor);
        break;
      case MAJOR.TAG:
        this.skipTag(minor);
        break;
    }
  }

  public skipMinorLen(minor: number): number {
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
      case 31:
        return -1;
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  // --------------------------------------------------------- Integer skipping

  public skipUNint(minor: number): void {
    if (minor <= 23) return;
    switch (minor) {
      case 24:
        return this.reader.skip(1);
      case 25:
        return this.reader.skip(2);
      case 26:
        return this.reader.skip(4);
      case 27:
        return this.reader.skip(8);
      default:
        throw ERROR.UNEXPECTED_MINOR;
    }
  }

  // ---------------------------------------------------------- Binary skipping

  public skipBin(minor: number): void {
    const length = this.skipMinorLen(minor);
    if (length >= 0) this.reader.skip(length);
    else {
      while (this.reader.peak() !== CONST.END) this.skipBinChunk();
      this.reader.x++;
    }
  }

  public skipBinChunk(): void {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.BIN) throw ERROR.UNEXPECTED_BIN_CHUNK_MAJOR;
    if (minor > 27) throw ERROR.UNEXPECTED_BIN_CHUNK_MINOR;
    this.skipBin(minor);
  }

  // ---------------------------------------------------------- String skipping

  public skipStr(minor: number): void {
    const length = this.skipMinorLen(minor);
    if (length >= 0) this.reader.skip(length);
    else {
      while (this.reader.peak() !== CONST.END) this.skipStrChunk();
      this.reader.x++;
    }
  }

  public skipStrChunk(): void {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    if (major !== MAJOR.STR) throw ERROR.UNEXPECTED_STR_CHUNK_MAJOR;
    if (minor > 27) throw ERROR.UNEXPECTED_STR_CHUNK_MINOR;
    this.skipStr(minor);
  }

  // ----------------------------------------------------------- Array skipping

  public skipArr(minor: number): void {
    const length = this.skipMinorLen(minor);
    if (length >= 0) this.skipN(length);
    else {
      while (this.reader.peak() !== CONST.END) this.skipAny();
      this.reader.x++;
    }
  }

  // ---------------------------------------------------------- Object skipping

  public skipObj(minor: number): void {
    const length = this.readMinorLen(minor);
    if (length >= 0) return this.skipN(length * 2);
    else {
      while (this.reader.peak() !== CONST.END) {
        this.skipAny();
        if (this.reader.peak() === CONST.END) throw ERROR.UNEXPECTED_OBJ_BREAK;
        this.skipAny();
      }
      this.reader.x++;
    }
  }

  // ------------------------------------------------------------- Tag skipping

  public skipTag(minor: number): void {
    const length = this.skipMinorLen(minor);
    if (length < 0) throw ERROR.UNEXPECTED_MINOR;
    this.skipAny();
  }

  // ----------------------------------------------------------- Token skipping

  public skipTkn(minor: number): void {
    switch (minor) {
      case 0xf8 & CONST.MINOR_MASK:
        this.reader.skip(1);
        return;
      case 0xf9 & CONST.MINOR_MASK:
        this.reader.skip(2);
        return;
      case 0xfa & CONST.MINOR_MASK:
        this.reader.skip(4);
        return;
      case 0xfb & CONST.MINOR_MASK:
        this.reader.skip(8);
        return;
    }
    if (minor <= 23) return;
    throw ERROR.UNEXPECTED_MINOR;
  }
}
