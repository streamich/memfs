/**
 * A wrapping for MessagePack extension or CBOR tag value. When encoder
 * encounters {@link JsonPackExtension} it will encode it as a MessagePack
 * extension or CBOR tag. Likewise, the decoder will
 * decode extensions into {@link JsonPackExtension}.
 *
 * @category Value
 */
export class JsonPackExtension<T = Uint8Array> {
  constructor(public readonly tag: number, public readonly val: T) {}
}
