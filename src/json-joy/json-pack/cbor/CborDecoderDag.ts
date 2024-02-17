import {JsonPackExtension} from '../JsonPackExtension';
import {CborDecoder} from './CborDecoder';

export class CborDecoderDag extends CborDecoder {
  public readTagRaw(tag: number): JsonPackExtension<unknown> | unknown {
    const value = this.val();
    return tag === 42 ? new JsonPackExtension<unknown>(tag, value) : value;
  }
}
