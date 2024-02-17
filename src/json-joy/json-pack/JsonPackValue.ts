/**
 * Use this wrapper is you have a pre-encoded MessagePack or CBOR value and you would
 * like to dump it into a the document as-is. The contents of `buf` will
 * be written as is to the document.
 *
 * It also serves as CBOR simple value container. In which case the type of value
 * `val` field is "number".
 *
 * @category Value
 */
export class JsonPackValue<T = Uint8Array> {
  constructor(public readonly val: T) {}
}
