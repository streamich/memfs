import {CborEncoder} from 'json-joy/es6/json-pack/cbor/CborEncoder';
import {CborDecoder} from 'json-joy/es6/json-pack/cbor/CborDecoder';

export const encoder = new CborEncoder();
export const decoder = new CborDecoder();
