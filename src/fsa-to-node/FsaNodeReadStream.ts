import { Readable } from 'node:stream';
import { Defer } from 'thingies/lib/Defer';
import { concurrency } from 'thingies/lib/concurrency';
import type { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import type { IReadStream } from '../node/types/misc';
import type { IReadStreamOptions } from '../node/types/options';
import type { FsaNodeFs } from './FsaNodeFs';

export class FsaNodeReadStream extends Readable implements IReadStream {
  protected __pending__: boolean = true;
  protected __closed__: boolean = false;
  protected __bytes__: number = 0;
  protected readonly __mutex__ = concurrency(1);
  protected readonly __file__ = new Defer<FsaNodeFsOpenFile>();

  public constructor(
    protected readonly fs: FsaNodeFs,
    protected readonly handle: Promise<FsaNodeFsOpenFile>,
    public readonly path: string,
    protected readonly options: IReadStreamOptions,
  ) {
    super();
    handle
      .then(file => {
        if (this.__closed__) return;
        this.__file__.resolve(file);
        if (this.options.fd !== undefined) this.emit('open', file.fd);
        this.emit('ready');
      })
      .catch(error => {
        this.__file__.reject(error);
      })
      .finally(() => {
        this.__pending__ = false;
      });
  }

  private async __read__(): Promise<Uint8Array | undefined> {
    return await this.__mutex__<Uint8Array | undefined>(async () => {
      if (this.__closed__) return;
      const { file } = await this.__file__.promise;
      const blob = await file.getFile();
      const buffer = await blob.arrayBuffer();
      const start = this.options.start || 0;
      let end = typeof this.options.end === 'number' ? this.options.end + 1 : buffer.byteLength;
      if (end > buffer.byteLength) end = buffer.byteLength;
      const uint8 = new Uint8Array(buffer, start, end - start);
      return uint8;
    });
  }

  private __close__(): void {
    if (this.__closed__) return;
    this.__closed__ = true;
    if (this.options.autoClose) {
      this.__file__.promise
        .then(file => {
          this.fs.close(file.fd, () => {
            this.emit('close');
          });
          return file.close();
        })
        .catch(error => {});
    }
  }

  // -------------------------------------------------------------- IReadStream

  public get bytesRead(): number {
    return this.__bytes__;
  }

  public get pending(): boolean {
    return this.__pending__;
  }

  // ----------------------------------------------------------------- Readable

  _read() {
    this.__read__().then(
      (uint8: Uint8Array) => {
        if (this.__closed__) return;
        if (!uint8) return this.push(null);
        this.__bytes__ += uint8.length;
        this.__close__();
        this.push(uint8);
        this.push(null);
      },
      error => {
        this.__close__();
        this.destroy(error);
      },
    );
  }
}
