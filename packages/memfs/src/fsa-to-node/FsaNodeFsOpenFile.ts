import { FLAG_CON } from '@jsonjoy.com/fs-node-utils';
import type * as fsa from '@jsonjoy.com/fs-fsa';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

/**
 * Represents an open file. Stores additional metadata about the open file, such
 * as the seek position.
 */
export class FsaNodeFsOpenFile {
  protected seek: number = 0;

  /**
   * This influences the behavior of the next write operation. On the first
   * write we want to overwrite the file or keep the existing data, depending
   * with which flags the file was opened. On subsequent writes we want to
   * append to the file.
   */
  protected keepExistingData: boolean;

  public constructor(
    public readonly fd: number,
    public readonly createMode: misc.TMode,
    public readonly flags: number,
    public readonly file: fsa.IFileSystemFileHandle,
    public readonly filename: string,
  ) {
    this.keepExistingData = !!(flags & FLAG_CON.O_APPEND);
  }

  public async close(): Promise<void> {}

  public async write(data: ArrayBufferView, seek: number | null): Promise<void> {
    if (typeof seek !== 'number') seek = this.seek;
    else this.keepExistingData = true;
    const keepExistingData = this.keepExistingData;
    const writer = await this.file.createWritable({ keepExistingData });
    await writer.write({
      type: 'write',
      data,
      position: seek,
    });
    await writer.close();
    this.keepExistingData = true;
    this.seek += data.byteLength;
  }
}
