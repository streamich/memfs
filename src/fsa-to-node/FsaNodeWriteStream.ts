import { Writable } from 'stream';
import { Defer } from 'thingies/es6/Defer';
import type { IFileSystemFileHandle } from '../fsa/types';
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
  protected __pending: boolean = true;
  protected ready = new Defer<void>();
  protected closed: boolean = false;

  public constructor(
    protected readonly handle: Promise<IFileSystemFileHandle>,
    public readonly path: string,
    protected readonly options?: IWriteStreamOptions,
  ) {
    super();
    handle
      .then(() => {
        this.__pending = false;
        this.ready.resolve();
      })
      .catch(error => {
        this.ready.reject(error);
      });
  }

  // ------------------------------------------------------------- IWriteStream

  public get bytesWritten(): number {
    return 0;
  }

  public get pending(): boolean {
    return this.__pending;
  }

  public close(): void {}

  // ----------------------------------------------------------------- Writable

  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {}

  _writev(chunks: Array<{ chunk: any; encoding: string }>, callback: (error?: Error | null) => void): void {}

  _final(callback: (error?: Error | null) => void): void {}
}
