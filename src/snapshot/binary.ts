import {CborEncoder} from 'json-joy/es6/json-pack/cbor/CborEncoder';
import {CborDecoder} from 'json-joy/es6/json-pack/cbor/CborDecoder';
import {fromSnapshotSync, toSnapshotSync} from './sync';
import {fromSnapshot, toSnapshot} from './async';
import type {CborUint8Array} from 'json-joy/es6/json-pack/cbor/types';
import type {AsyncSnapshotOptions, SnapshotNode, SnapshotOptions} from './types';

const encoder = new CborEncoder();
const decoder = new CborDecoder();

export const toBinarySnapshotSync = (options: SnapshotOptions): CborUint8Array<SnapshotNode> => {
  const snapshot = toSnapshotSync(options);
  return encoder.encode(snapshot) as CborUint8Array<SnapshotNode>;
};

export const fromBinarySnapshotSync = (uint8: CborUint8Array<SnapshotNode>, options: SnapshotOptions): void => {
  const snapshot = decoder.decode(uint8) as SnapshotNode;
  fromSnapshotSync(snapshot, options);
};

export const toBinarySnapshot = async (options: AsyncSnapshotOptions): Promise<CborUint8Array<SnapshotNode>> => {
  const snapshot = await toSnapshot(options);
  return encoder.encode(snapshot) as CborUint8Array<SnapshotNode>;
};

export const fromBinarySnapshot = async (uint8: CborUint8Array<SnapshotNode>, options: AsyncSnapshotOptions): Promise<void> => {
  const snapshot = decoder.decode(uint8) as SnapshotNode;
  await fromSnapshot(snapshot, options);
};
