/// <reference types="node" />
import { Buffer } from 'buffer';
declare const bufferAllocUnsafe: (size: number) => Buffer;
declare const bufferFrom: {
  (arrayBuffer: ArrayBufferLike, byteOffset?: number | undefined, length?: number | undefined): Buffer;
  (data: any[]): Buffer;
  (data: Uint8Array): Buffer;
  (
    obj:
      | {
          valueOf(): string | object;
        }
      | {
          [Symbol.toPrimitive](hint: 'string'): string;
        },
    byteOffset?: number | undefined,
    length?: number | undefined,
  ): Buffer;
  (str: string, encoding?: string | undefined): Buffer;
};
export { Buffer, bufferAllocUnsafe, bufferFrom };
