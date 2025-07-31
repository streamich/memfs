import type { IFileSystemWritableFileStream, FileSystemWritableFileStreamParams, Data } from './types';
import type { Superblock } from '../core/Superblock';
import { Buffer } from '../internal/buffer';
import { ERROR_CODE } from '../core/constants';
import { newNotAllowedError } from './util';
import { FLAGS, MODE } from '../node/constants';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export class CoreFileSystemWritableFileStream extends WritableStream implements IFileSystemWritableFileStream {
  private _fd: number | undefined;
  private _position: number = 0;
  private _closed = false;
  private readonly _core: Superblock;
  private readonly _path: string;

  constructor(core: Superblock, path: string, keepExistingData: boolean = false) {
    let fd: number | undefined;

    super({
      start: controller => {
        // Open file for writing
        const flags = keepExistingData ? FLAGS['r+'] : FLAGS.w;
        try {
          fd = core.open(path, flags, MODE.FILE);
        } catch (error) {
          if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
            throw newNotAllowedError();
          }
          throw error;
        }
      },
      write: async (chunk: Data | FileSystemWritableFileStreamParams) => {
        await this._write(chunk);
      },
      close: async () => {
        if (!this._closed && this._fd !== undefined) {
          core.close(this._fd);
          this._closed = true;
        }
      },
      abort: async () => {
        if (!this._closed && this._fd !== undefined) {
          core.close(this._fd);
          this._closed = true;
        }
      },
    });

    this._core = core;
    this._path = path;
    this._fd = fd;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
   */
  public async seek(position: number): Promise<void> {
    if (this._closed) {
      throw new DOMException('The stream is closed.', 'InvalidStateError');
    }
    this._position = position;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
   */
  public async truncate(size: number): Promise<void> {
    if (this._closed) {
      throw new DOMException('The stream is closed.', 'InvalidStateError');
    }
    try {
      const link = this._core.getResolvedLinkOrThrow(this._path);
      const node = link.getNode();
      node.truncate(size);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
   */
  public async write(chunk: Data): Promise<void>;
  public async write(params: FileSystemWritableFileStreamParams): Promise<void>;
  public async write(chunkOrParams: Data | FileSystemWritableFileStreamParams): Promise<void> {
    await this._write(chunkOrParams);
  }

  private async _write(chunkOrParams: Data | FileSystemWritableFileStreamParams): Promise<void> {
    if (this._closed) {
      throw new DOMException('The stream is closed.', 'InvalidStateError');
    }

    if (this._fd === undefined) {
      throw new DOMException('The stream is not ready.', 'InvalidStateError');
    }

    try {
      if (this._isParams(chunkOrParams)) {
        const params = chunkOrParams;
        switch (params.type) {
          case 'write': {
            if (params.data !== undefined) {
              const buffer = this._dataToBuffer(params.data);
              const position = params.position !== undefined ? params.position : this._position;
              const written = this._core.write(this._fd, buffer, 0, buffer.length, position);
              if (params.position === undefined) {
                this._position += written;
              }
            }
            break;
          }
          case 'seek': {
            if (params.position !== undefined) {
              this._position = params.position;
            }
            break;
          }
          case 'truncate': {
            if (params.size !== undefined) {
              await this.truncate(params.size);
            }
            break;
          }
        }
      } else {
        // Direct data write
        const buffer = this._dataToBuffer(chunkOrParams);
        const written = this._core.write(this._fd, buffer, 0, buffer.length, this._position);
        this._position += written;
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === ERROR_CODE.EACCES) {
        throw newNotAllowedError();
      }
      throw error;
    }
  }

  private _isParams(chunk: Data | FileSystemWritableFileStreamParams): chunk is FileSystemWritableFileStreamParams {
    return !!(chunk && typeof chunk === 'object' && 'type' in chunk);
  }

  private _dataToBuffer(data: Data): Buffer {
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf8');
    }
    if (data instanceof Buffer) {
      return data;
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    if (data instanceof Blob) {
      // For Blob, we would need to read it asynchronously
      // This is a simplified implementation
      throw new Error('Blob data type not fully supported in this implementation');
    }
    throw new Error('Unsupported data type');
  }
}
