import { Buffer } from '../vendor/node/internal/buffer';
import type { Data, FileSystemWritableFileStreamParams, IFileSystemWritableFileStream } from '../fsa/types';
import type { IFileHandle } from '../node/types/misc';
import type { NodeFsaFs, NodeFsaContext } from './types';
import { newNoModificationAllowedError } from './util';

/**
 * When Chrome writes to the file, it creates a copy of the file with extension
 * `.crswap` and then replaces the original file with the copy only when the
 * `close()` method is called. If the `abort()` method is called, the `.crswap`
 * file is deleted.
 *
 * If a file name with with extension `.crswap` is already taken, it
 * creates a new swap file with extension `.1.crswap` and so on.
 */
export const createSwapFile = async (
  fs: NodeFsaFs,
  path: string,
  keepExistingData: boolean,
): Promise<[handle: IFileHandle, path: string]> => {
  let handle: undefined | IFileHandle;
  let swapPath: string = path + '.crswap';
  try {
    handle = await fs.promises.open(swapPath, 'ax');
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'EEXIST') throw error;
  }
  if (!handle) {
    for (let i = 1; i < 1000; i++) {
      try {
        swapPath = `${path}.${i}.crswap`;
        handle = await fs.promises.open(swapPath, 'ax');
        break;
      } catch (error) {
        if (!error || typeof error !== 'object' || error.code !== 'EEXIST') throw error;
      }
    }
  }
  if (!handle) throw new Error(`Could not create a swap file for "${path}".`);
  if (keepExistingData) await fs.promises.copyFile(path, swapPath, fs.constants.COPYFILE_FICLONE);
  return [handle, swapPath];
};

interface SwapFile {
  /** Swap file full path name. */
  path: string;
  /** Seek offset in the file. */
  offset: number;
  /** Node.js open FileHandle. */
  handle?: IFileHandle;
  /** Resolves when swap file is ready for operations. */
  ready?: Promise<void>;
}

declare const require: any;
const WS = (
  typeof WritableStream === 'undefined' ? require('stream/web').WritableStream : WritableStream
) as typeof WritableStream;

/**
 * Is a WritableStream object with additional convenience methods, which
 * operates on a single file on disk. The interface is accessed through the
 * `FileSystemFileHandle.createWritable()` method.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export class NodeFileSystemWritableFileStream extends WS implements IFileSystemWritableFileStream {
  protected readonly swap: SwapFile;

  constructor(
    protected readonly fs: NodeFsaFs,
    protected readonly path: string,
    keepExistingData: boolean,
    protected readonly ctx: NodeFsaContext,
  ) {
    const swap: SwapFile = { handle: undefined, path: '', offset: 0 };
    super({
      async start() {
        if (ctx.locks.isLocked(path)) {
          throw newNoModificationAllowedError();
        }
        ctx.locks.acquireLock(path);
        try {
          const promise = createSwapFile(fs, path, keepExistingData);
          swap.ready = promise.then(() => undefined);
          const [handle, swapPath] = await promise;
          swap.handle = handle;
          swap.path = swapPath;
        } catch (error) {
          ctx.locks.releaseLock(path);
          throw error;
        }
      },
      async write(chunk: Data) {
        await swap.ready;
        const handle = swap.handle;
        if (!handle) throw new Error('Invalid state');
        const buffer = Buffer.from(
          typeof chunk === 'string'
            ? chunk
            : chunk instanceof Blob
              ? new Uint8Array(await chunk.arrayBuffer())
              : (chunk as Uint8Array),
        );
        const { bytesWritten } = await handle.write(buffer, 0, buffer.length, swap.offset);
        swap.offset += bytesWritten;
      },
      async close() {
        await swap.ready;
        const handle = swap.handle;
        if (!handle) return;
        await handle.close();
        await fs.promises.rename(swap.path, path);
        ctx.locks.releaseLock(path);
      },
      async abort() {
        await swap.ready;
        const handle = swap.handle;
        if (!handle) return;
        await handle.close();
        await fs.promises.unlink(swap.path);
        ctx.locks.releaseLock(path);
      },
    });
    this.swap = swap;
  }

  /**
   * @sse https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
   * @param position An `unsigned long` describing the byte position from the top
   *                 (beginning) of the file.
   */
  public async seek(position: number): Promise<void> {
    this.swap.offset = position;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
   * @param size An `unsigned long` of the amount of bytes to resize the stream to.
   */
  public async truncate(size: number): Promise<void> {
    await this.swap.ready;
    const handle = this.swap.handle;
    if (!handle) throw new Error('Invalid state');
    await handle.truncate(size);
    if (this.swap.offset > size) this.swap.offset = size;
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
            if (ArrayBuffer.isView(params)) {
              return this.writeBase(params);
            } else {
              const options = params as FileSystemWritableFileStreamParams;
              switch (options.type) {
                case 'write': {
                  if (typeof options.position === 'number') await this.seek(options.position);
                  return this.writeBase(params.data);
                }
                case 'truncate': {
                  if (typeof params.size !== 'number') throw new TypeError('Missing required argument: size');
                  if (this.swap.offset > params.size) this.swap.offset = params.size;
                  return this.truncate(params.size);
                }
                case 'seek':
                  if (typeof params.position !== 'number') throw new TypeError('Missing required argument: position');
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
