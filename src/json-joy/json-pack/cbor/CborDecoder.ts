import {CONST, ERROR, MAJOR} from './constants';
import {CborDecoderBase} from './CborDecoderBase';
import {JsonPackValue} from '../JsonPackValue';
import type {Path} from '../../json-pointer';
import type {IReader, IReaderResettable} from '../../util/buffers';

export class CborDecoder<
  R extends IReader & IReaderResettable = IReader & IReaderResettable,
> extends CborDecoderBase<R> {
  // -------------------------------------------------------------- Map reading

  public readAsMap(): Map<unknown, unknown> {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    switch (major) {
      case MAJOR.MAP:
        return this.readMap(minor);
      default:
        throw ERROR.UNEXPECTED_MAJOR;
    }
  }

  public readMap(minor: number): Map<unknown, unknown> {
    const length = this.readMinorLen(minor);
    if (length >= 0) return this.readMapRaw(length);
    else return this.readMapIndef();
  }

  public readMapRaw(length: number): Map<unknown, unknown> {
    const map: Map<unknown, unknown> = new Map();
    for (let i = 0; i < length; i++) {
      const key = this.val();
      const value = this.val();
      map.set(key, value);
    }
    return map;
  }

  public readMapIndef(): Map<unknown, unknown> {
    const map: Map<unknown, unknown> = new Map();
    while (this.reader.peak() !== CONST.END) {
      const key = this.val();
      if (this.reader.peak() === CONST.END) throw ERROR.UNEXPECTED_OBJ_BREAK;
      const value = this.val();
      map.set(key, value);
    }
    this.reader.x++;
    return map;
  }

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

  // --------------------------------------------------------------- Validation

  /**
   * Throws if at given offset in a buffer there is an invalid CBOR value, or
   * if the value does not span the exact length specified in `size`. I.e.
   * throws if:
   *
   * - The value is not a valid CBOR value.
   * - The value is shorter than `size`.
   * - The value is longer than `size`.
   *
   * @param value Buffer in which to validate CBOR value.
   * @param offset Offset at which the value starts.
   * @param size Expected size of the value.
   */
  public validate(value: Uint8Array, offset: number = 0, size: number = value.length): void {
    this.reader.reset(value);
    this.reader.x = offset;
    const start = offset;
    this.skipAny();
    const end = this.reader.x;
    if (end - start !== size) throw ERROR.INVALID_SIZE;
  }

  // -------------------------------------------- One level reading - any value

  public decodeLevel(value: Uint8Array): unknown {
    this.reader.reset(value);
    return this.readLevel();
  }

  /**
   * Decodes only one level of objects and arrays. Other values are decoded
   * completely.
   *
   * @returns One level of decoded CBOR value.
   */
  public readLevel(): unknown {
    const octet = this.reader.u8();
    const major = octet >> 5;
    const minor = octet & CONST.MINOR_MASK;
    switch (major) {
      case MAJOR.ARR:
        return this.readArrLevel(minor);
      case MAJOR.MAP:
        return this.readObjLevel(minor);
      default:
        return super.readAnyRaw(octet);
    }
  }

  /**
   * Decodes primitive values, returns container values as `JsonPackValue`.
   *
   * @returns A primitive value, or CBOR container value as a blob.
   */
  public readPrimitiveOrVal(): unknown | JsonPackValue {
    const octet = this.reader.peak();
    const major = octet >> 5;
    switch (major) {
      case MAJOR.ARR:
      case MAJOR.MAP:
        return this.readAsValue();
      default:
        return this.val();
    }
  }

  public readAsValue(): JsonPackValue {
    const reader = this.reader;
    const start = reader.x;
    this.skipAny();
    const end = reader.x;
    return new JsonPackValue(reader.uint8.subarray(start, end));
  }

  // ----------------------------------------------- One level reading - object

  public readObjLevel(minor: number): Record<string, unknown> {
    const length = this.readMinorLen(minor);
    if (length >= 0) return this.readObjRawLevel(length);
    else return this.readObjIndefLevel();
  }

  public readObjRawLevel(length: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < length; i++) {
      const key = this.key();
      const value = this.readPrimitiveOrVal();
      obj[key] = value;
    }
    return obj;
  }

  public readObjIndefLevel(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (this.reader.peak() !== CONST.END) {
      const key = this.key();
      if (this.reader.peak() === CONST.END) throw ERROR.UNEXPECTED_OBJ_BREAK;
      const value = this.readPrimitiveOrVal();
      obj[key] = value;
    }
    this.reader.x++;
    return obj;
  }

  // ------------------------------------------------ One level reading - array

  public readArrLevel(minor: number): unknown[] {
    const length = this.readMinorLen(minor);
    if (length >= 0) return this.readArrRawLevel(length);
    return this.readArrIndefLevel();
  }

  public readArrRawLevel(length: number): unknown[] {
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) arr.push(this.readPrimitiveOrVal());
    return arr;
  }

  public readArrIndefLevel(): unknown[] {
    const arr: unknown[] = [];
    while (this.reader.peak() !== CONST.END) arr.push(this.readPrimitiveOrVal());
    this.reader.x++;
    return arr;
  }

  // ---------------------------------------------------------- Shallow reading

  public readHdr(expectedMajor: number): number {
    const octet = this.reader.u8();
    const major = octet >> 5;
    if (major !== expectedMajor) throw ERROR.UNEXPECTED_MAJOR;
    const minor = octet & CONST.MINOR_MASK;
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
    }
    throw ERROR.UNEXPECTED_MINOR;
  }

  public readStrHdr(): number {
    return this.readHdr(MAJOR.STR);
  }

  public readObjHdr(): number {
    return this.readHdr(MAJOR.MAP);
  }

  public readArrHdr(): number {
    return this.readHdr(MAJOR.ARR);
  }

  public findKey(key: string): this {
    const size = this.readObjHdr();
    for (let i = 0; i < size; i++) {
      const k = this.key();
      if (k === key) return this;
      this.skipAny();
    }
    throw ERROR.KEY_NOT_FOUND;
  }

  public findIndex(index: number): this {
    const size = this.readArrHdr();
    if (index >= size) throw ERROR.INDEX_OUT_OF_BOUNDS;
    for (let i = 0; i < index; i++) this.skipAny();
    return this;
  }

  public find(path: Path): this {
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (typeof segment === 'string') this.findKey(segment);
      else this.findIndex(segment);
    }
    return this;
  }
}
