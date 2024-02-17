import {CborEncoderStable} from './CborEncoderStable';

export class CborEncoderDag extends CborEncoderStable {
  public writeUndef(): void {
    this.writeNull();
  }

  public writeFloat(float: number): void {
    if (float !== float) return this.writeNull();
    if (!Number.isFinite(float)) return this.writeNull();
    super.writeFloat(float);
  }

  public writeTag(tag: number, value: unknown): void {
    if (tag === 42) this.writeTagHdr(tag);
    this.writeAny(value);
  }
}
