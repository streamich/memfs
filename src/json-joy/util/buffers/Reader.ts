import {decodeUtf8} from './utf8/decodeUtf8';
import type {IReader, IReaderResettable} from './types';

export class Reader implements IReader, IReaderResettable {
  public uint8 = new Uint8Array([]);
  public view = new DataView(this.uint8.buffer);
  public x = 0;

  public reset(uint8: Uint8Array): void {
    this.x = 0;
    this.uint8 = uint8;
    this.view = new DataView(uint8.buffer, uint8.byteOffset, uint8.length);
  }

  public peak(): number {
    return this.view.getUint8(this.x);
  }

  public skip(length: number): void {
    this.x += length;
  }

  public buf(size: number): Uint8Array {
    const end = this.x + size;
    const bin = this.uint8.subarray(this.x, end);
    this.x = end;
    return bin;
  }

  public u8(): number {
    return this.uint8[this.x++];
    // return this.view.getUint8(this.x++);
  }

  public i8(): number {
    return this.view.getInt8(this.x++);
  }

  public u16(): number {
    // const num = this.view.getUint16(this.x);
    // this.x += 2;
    // return num;
    let x = this.x;
    const num = (this.uint8[x++] << 8) + this.uint8[x++];
    this.x = x;
    return num;
  }

  public i16(): number {
    const num = this.view.getInt16(this.x);
    this.x += 2;
    return num;
  }

  public u32(): number {
    const num = this.view.getUint32(this.x);
    this.x += 4;
    return num;
  }

  public i32(): number {
    const num = this.view.getInt32(this.x);
    this.x += 4;
    return num;
  }

  public u64(): bigint {
    const num = this.view.getBigUint64(this.x);
    this.x += 8;
    return num;
  }

  public i64(): bigint {
    const num = this.view.getBigInt64(this.x);
    this.x += 8;
    return num;
  }

  public f32(): number {
    const pos = this.x;
    this.x += 4;
    return this.view.getFloat32(pos);
  }

  public f64(): number {
    const pos = this.x;
    this.x += 8;
    return this.view.getFloat64(pos);
  }

  public utf8(size: number): string {
    const start = this.x;
    this.x += size;
    return decodeUtf8(this.uint8, start, size);
  }

  public ascii(length: number): string {
    const uint8 = this.uint8;
    let str = '';
    const end = this.x + length;
    for (let i = this.x; i < end; i++) str += String.fromCharCode(uint8[i]);
    this.x = end;
    return str;
  }
}
