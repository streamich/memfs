import { Readable } from 'stream';
import type { IReadStream } from '../node/types/misc';

export class FsaNodeReadStream extends Readable implements IReadStream {
  public constructor() {
    super();
  }

  // -------------------------------------------------------------- IReadStream
  public get bytesRead(): number {
    throw new Error('Method not implemented.');
  }

  public get path(): string | Buffer {
    throw new Error('Method not implemented.');
  }

  public get pending(): boolean {
    throw new Error('Method not implemented.');
  }

  // ----------------------------------------------------------------- Readable

  _read(size: number) {}
}
