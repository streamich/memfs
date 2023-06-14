import type { IFileHandle } from '../promises';
import type { NodeFsaFs } from './types';

/**
 * Is a WritableStream object with additional convenience methods, which
 * operates on a single file on disk. The interface is accessed through the
 * `FileSystemFileHandle.createWritable()` method.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export class NodeFileSystemWritableFileStream extends WritableStream {
  protected handle: IFileHandle | undefined = undefined;

  constructor(protected readonly fs: NodeFsaFs, protected readonly path: string) {
    const ref: { handle: IFileHandle | undefined } = { handle: undefined };
    super({
      async start() {
        ref.handle = await fs.promises.open(path, 'w');
      },
      async write(chunk: Data) {
        const handle = ref.handle;
        if (!handle) throw new Error('Invalid state');
        const buffer = Buffer.from(
          typeof chunk === 'string' ? chunk : chunk instanceof Blob ? await chunk.arrayBuffer() : chunk,
        );
        await handle.write(buffer);
      },
      async close() {
        if (ref.handle) await ref.handle.close();
      },
      async abort() {
        if (ref.handle) await ref.handle.close();
      },
    });
  }

  /**
   * @sse https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
   * @param position An `unsigned long` describing the byte position from the top
   *                 (beginning) of the file.
   */
  public async seek(position: number): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
   * @param size An `unsigned long` of the amount of bytes to resize the stream to.
   */
  public async truncate(size: number): Promise<void> {
    throw new Error('Not implemented');
  }

  protected async writeBase(chunk: Data): Promise<void> {
    const writer = this.getWriter();
    try {
      await writer.write(chunk);
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
   */
  public async write(chunk: Data): Promise<void>;
  public async write(params: FileSystemWritableFileStreamParams): Promise<void>;
  public async write(params): Promise<void> {
    if (!params) throw new TypeError('Missing required argument: params');
    switch (typeof params) {
      case 'string': {
        return this.writeBase(params);
      }
      case 'object': {
        const constructor = params.constructor;
        switch (constructor) {
          case ArrayBuffer:
          case Blob:
          case DataView:
            return this.writeBase(params);
          default: {
            if (ArrayBuffer.isView(params)) return this.writeBase(params);
            else {
              switch (params.type) {
                case 'write':
                  return this.writeBase(params.data);
                case 'truncate':
                  return this.truncate(params.size);
                case 'seek':
                  return this.seek(params.position);
                default:
                  throw new TypeError('Invalid argument: params');
              }
            }
          }
        }
      }
      default:
        throw new TypeError('Invalid argument: params');
    }
  }
}

export interface FileSystemWritableFileStreamParams {
  type: 'write' | 'truncate' | 'seek';
  data?: Data;
  position?: number;
  size?: number;
}

export type Data =
  | ArrayBuffer
  | ArrayBufferView
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | BigUint64Array
  | BigInt64Array
  | DataView
  | Blob
  | string;
