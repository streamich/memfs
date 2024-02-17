export class Slice {
  constructor(
    public readonly uint8: Uint8Array,
    public readonly view: DataView,
    public readonly start: number,
    public readonly end: number,
  ) {}
}
