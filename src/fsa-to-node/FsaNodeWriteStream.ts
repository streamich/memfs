import { Writable } from 'stream';
import { Defer } from 'thingies/es6/Defer';
import { concurrency } from 'thingies/es6/concurrency';
import type { IFileSystemFileHandle, IFileSystemWritableFileStream } from '../fsa/types';
import type { IWriteStream } from '../node/types/misc';
import type { IWriteStreamOptions } from '../node/types/options';

/**
 * This WriteStream implementation does not build on top of the `fs` module,
 * but instead uses the lower-level `FileSystemFileHandle` interface. The reason
 * is the different semantics in `fs` and FSA (File System Access API) write streams.
 *
 * When data is written to an FSA file, a new FSA stream is created, it copies
 * the file to a temporary swap file. After each written chunk, that swap file
 * is closed and the original file is replaced with the swap file. This means,
 * if WriteStream was built on top of `fs`, each chunk write would result in
 * a file copy, write, close, rename operations, which is not what we want.
 *
 * Instead this implementation hooks into the lower-level and closes the swap
 * file only once the stream is closed. The downside is that the written data
 * is not immediately visible to other processes (because it is written to the
 * swap file), but that is the trade-off we have to make.
 */
export class FsaNodeWriteStream extends Writable implements IWriteStream {
  protected __pending__: boolean = true;
  protected __closed__: boolean = false;
  protected __bytes__: number = 0;
  protected readonly __stream__: Promise<IFileSystemWritableFileStream>;
  protected readonly __mutex__ = concurrency(1);

  public constructor(
    handle: Promise<IFileSystemFileHandle>,
    public readonly path: string,
    protected readonly options?: IWriteStreamOptions,
  ) {
    super();
    const stream = new Defer<IFileSystemWritableFileStream>();
    this.__stream__ = stream.promise;
    (async () => {
      const fsaHandle = await handle;
      const writable = await fsaHandle.createWritable({keepExistingData: true});
      this.__pending__ = false;
      stream.resolve(writable);
    })().catch(error => {
      stream.reject(error);
    });
  }

  private async ___write___(buffers: Buffer[]): Promise<void> {
    await this.__mutex__(async () => {
      if (this.__closed__) return;
      // if (this.__closed__) throw new Error('WriteStream is closed');
      const writable = await this.__stream__;
      for (const buffer of buffers) {
        await writable.write(buffer);
        this.__bytes__ += buffer.byteLength;
      }
    });
  }

  private async __close__(): Promise<void> {
    await this.__mutex__(async () => {
      if (this.__closed__) {
        process.nextTick(() => this.emit('close'));
        return;
      }
      try {
        const writable = await this.__stream__;
        this.__closed__ = true;
        await writable.close();
        this.emit('close');
      } catch (error) {
        this.emit('error', error);
        this.emit('close', error);
      }
    });
  }

  // ------------------------------------------------------------- IWriteStream

  public get bytesWritten(): number {
    return this.__bytes__;
  }

  public get pending(): boolean {
    return this.__pending__;
  }

  public close(cb): void {
    if (cb) this.once('close', cb);
    this.__close__().catch(() => {});
  }

  // ----------------------------------------------------------------- Writable

  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.___write___([chunk])
      .then(() => callback(null))
      .catch(error => callback(error));
  }

  _writev(chunks: Array<{ chunk: any; encoding: string }>, callback: (error?: Error | null) => void): void {
    const buffers = chunks.map(({chunk}) => chunk);
    this.___write___(buffers)
      .then(() => callback(null))
      .catch(error => callback(error));
  }

  _final(callback: (error?: Error | null) => void): void {
    this.__close__().then(() => callback(null)).catch(error => callback(error));
  }
}
