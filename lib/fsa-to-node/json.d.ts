import { CborEncoder } from 'json-joy/es6/json-pack/cbor/CborEncoder';
import { CborDecoder } from 'json-joy/es6/json-pack/cbor/CborDecoder';
export declare const encoder: CborEncoder<import("json-joy/es6/util/buffers").IWriter & import("json-joy/es6/util/buffers").IWriterGrowable>;
export declare const decoder: CborDecoder<import("json-joy/es6/util/buffers").IReader & import("json-joy/es6/util/buffers").IReaderResettable>;
