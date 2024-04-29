import { CborEncoder } from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import { CborDecoder } from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder';

export const encoder = new CborEncoder();
export const decoder = new CborDecoder();
