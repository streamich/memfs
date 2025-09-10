import type { IFileSystemChangeRecord, IFileSystemDirectoryHandle, IFileSystemFileHandle, IFileSystemObserver, IFileSystemObserverObserveOptions, IFileSystemSyncAccessHandle } from './types';
import type { Superblock } from '../core';

export class CoreFileSystemObserver implements IFileSystemObserver {
  constructor (
    protected readonly _core: Superblock,
    protected readonly callback: (records: IFileSystemChangeRecord[], observer: IFileSystemObserver) => void
  ) {}

  public async observe(handle: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle, options?: IFileSystemObserverObserveOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /** Disconnect and stop all observations. */
  public disconnect(): void {
    throw new Error('Method not implemented.');
  }
}
