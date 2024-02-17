export class Slice {
  constructor(
    public readonly uint8: Uint8Array,
    public readonly view: DataView,
    public readonly start: number,
    public readonly end: number,
  ) {}

  public subarray(): Uint8Array {
    return this.uint8.subarray(this.start, this.end);
  }
}
