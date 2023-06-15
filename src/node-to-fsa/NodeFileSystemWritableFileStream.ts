import type { IFileHandle } from '../promises';
import type { NodeFsaFs } from './types';

interface Ref {
  handle: IFileHandle | undefined;
  offset: number;
  open?: Promise<void>;
}

/**
 * Is a WritableStream object with additional convenience methods, which
 * operates on a single file on disk. The interface is accessed through the
 * `FileSystemFileHandle.createWritable()` method.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export class NodeFileSystemWritableFileStream extends WritableStream {
  protected readonly ref: Ref;

  constructor(protected readonly fs: NodeFsaFs, protected readonly path: string, keepExistingData: boolean) {
    const ref: Ref = { handle: undefined, offset: 0 };
    super({
      async start() {
        const open = fs.promises.open(path, keepExistingData ? 'a+' : 'w');
        ref.open = open.then(() => undefined);
        ref.handle = await open;
      },
      async write(chunk: Data) {
        const handle = ref.handle;
        if (!handle) throw new Error('Invalid state');
        const buffer = Buffer.from(
          typeof chunk === 'string' ? chunk : chunk instanceof Blob ? await chunk.arrayBuffer() : chunk,
        );
        const { bytesWritten } = await handle.write(buffer, 0, buffer.length, ref.offset);
        ref.offset += bytesWritten;
      },
      async close() {
        if (ref.handle) await ref.handle.close();
      },
      async abort() {
        if (ref.handle) await ref.handle.close();
      },
    });
    this.ref = ref;
  }

  /**
   * @sse https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
   * @param position An `unsigned long` describing the byte position from the top
   *                 (beginning) of the file.
   */
  public async seek(position: number): Promise<void> {
    this.ref.offset = position;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
   * @param size An `unsigned long` of the amount of bytes to resize the stream to.
   */
  public async truncate(size: number): Promise<void> {
    await this.ref.open;
    const handle = this.ref.handle;
    if (!handle) throw new Error('Invalid state');
    await handle.truncate(size);
    if (this.ref.offset > size) this.ref.offset = size;
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
              const options = params as FileSystemWritableFileStreamParams;
              switch (options.type) {
                case 'write': {
                  if (typeof options.position === 'number') await this.seek(options.position);
                  return this.writeBase(params.data);
                }
                case 'truncate': {
                  if (typeof params.size !== 'number') throw new TypeError('Missing required argument: size');
                  if (this.ref.offset > params.size) this.ref.offset = params.size;
                  return this.truncate(params.size);
                }
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
