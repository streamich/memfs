import decodeUtf8 from './decodeUtf8/v10';
import {randomU32} from 'hyperdyperid/lib/randomU32';

class CacheItem {
  constructor(public readonly bytes: Uint8Array, public readonly value: string) {}
}

const enum CONST {
  MAX_CACHED_STR_LEN = 31,
  MAX_RECORDS_PER_SIZE = 16,
}

export class CachedUtf8Decoder {
  private readonly caches: CacheItem[][];

  constructor() {
    this.caches = [];
    for (let i = 0; i < CONST.MAX_CACHED_STR_LEN; i++) this.caches.push([]);
  }

  private get(bytes: Uint8Array, offset: number, size: number): string | null {
    const records = this.caches[size - 1]!;
    const len = records.length;
    FIND_CHUNK: for (let i = 0; i < len; i++) {
      const record = records[i];
      const recordBytes = record.bytes;
      for (let j = 0; j < size; j++) if (recordBytes[j] !== bytes[offset + j]) continue FIND_CHUNK;
      return record.value;
    }
    return null;
  }

  private store(bytes: Uint8Array, value: string): void {
    const records = this.caches[bytes.length - 1]!;
    const record = new CacheItem(bytes, value);
    const length = records.length;
    if (length >= CONST.MAX_RECORDS_PER_SIZE) records[randomU32(0, CONST.MAX_RECORDS_PER_SIZE - 1)] = record;
    else records.push(record);
  }

  public decode(bytes: Uint8Array, offset: number, size: number): string {
    if (!size) return '';
    const cachedValue = this.get(bytes, offset, size);
    if (cachedValue !== null) return cachedValue;
    const value = decodeUtf8(bytes, offset, size);
    // Ensure to copy a slice of bytes because the byte may be NodeJS Buffer and Buffer#slice() returns a reference to its internal ArrayBuffer.
    const copy = Uint8Array.prototype.slice.call(bytes, offset, offset + size);
    this.store(copy, value);
    return value;
  }
}
