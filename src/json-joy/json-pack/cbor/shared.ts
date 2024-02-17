import {CborEncoder} from './CborEncoder';
import {CborDecoder} from './CborDecoder';
import {CborUint8Array} from './types';

export type {CborUint8Array};

export const encoder = new CborEncoder();
export const decoder = new CborDecoder();

export const encode = <T>(data: T): CborUint8Array<T> => encoder.encode(data) as CborUint8Array<T>;
export const decode = <T>(blob: CborUint8Array<T>): T => decoder.read(blob) as T;
