import {isFloat32} from '../../util/buffers/isFloat32';
import {JsonPackExtension} from '../JsonPackExtension';
import {CborEncoderFast} from './CborEncoderFast';
import type {IWriter, IWriterGrowable} from '../../util/buffers';

export class CborEncoder<W extends IWriter & IWriterGrowable = IWriter & IWriterGrowable> extends CborEncoderFast<W> {
  /**
   * Called when the encoder encounters a value that it does not know how to encode.
   *
   * @param value Some JavaScript value.
   */
  public writeUnknown(value: unknown): void {
    this.writeNull();
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
          case Object:
            return this.writeObj(value as Record<string, unknown>);
          case Array:
            return this.writeArr(value as unknown[]);
          case Uint8Array:
            return this.writeBin(value as Uint8Array);
          case Map:
            return this.writeMap(value as Map<unknown, unknown>);
          case JsonPackExtension:
            return this.writeTag((<JsonPackExtension>value).tag, (<JsonPackExtension>value).val);
          default:
            return this.writeUnknown(value);
        }
      }
      case 'undefined':
        return this.writeUndef();
      case 'bigint':
        return this.writeBigInt(value as bigint);
      default:
        return this.writeUnknown(value);
    }
  }

  public writeFloat(float: number): void {
    if (isFloat32(float)) this.writer.u8f32(0xfa, float);
    else this.writer.u8f64(0xfb, float);
  }

  public writeMap(map: Map<unknown, unknown>): void {
    this.writeMapHdr(map.size);
    map.forEach((value, key) => {
      this.writeAny(key);
      this.writeAny(value);
    });
  }

  public writeUndef(): void {
    this.writer.u8(0xf7);
  }
}
