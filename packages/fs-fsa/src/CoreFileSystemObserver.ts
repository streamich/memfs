import { newNotAllowedError, newNotFoundError } from './util';
import { CoreWatcher, ERROR_CODE } from '@jsonjoy.com/fs-core';
import type {
  IFileSystemChangeRecord,
  IFileSystemDirectoryHandle,
  IFileSystemFileHandle,
  IFileSystemHandle,
  IFileSystemObserver,
  IFileSystemObserverObserveOptions,
  IFileSystemSyncAccessHandle,
} from './types';
import type { Superblock } from '@jsonjoy.com/fs-core';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
 */
export class CoreFileSystemObserver implements IFileSystemObserver {
  protected readonly _observations = new Map<
    IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    CoreWatcher
  >();

  constructor(
    protected readonly _core: Superblock,
    protected readonly callback: (records: IFileSystemChangeRecord[], observer: IFileSystemObserver) => void,
  ) {}

  public async observe(
    handle: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    options?: IFileSystemObserverObserveOptions,
  ): Promise<void> {
    const path = (handle as unknown as { __path?: unknown }).__path;
    if (typeof path !== 'string')
      throw new TypeError("Failed to execute 'observe' on 'FileSystemObserver': Invalid handle.");
    const isDirectory = (handle as IFileSystemHandle).kind === 'directory';
    const last = path[path.length - 1];
    const target = path.length > 1 && (last === '/' || last === '\\') ? path.slice(0, -1) : path;
    try {
      const watcher = new CoreWatcher(this._core, target, { recursive: isDirectory && !!options?.recursive });
      this._observations.get(handle)?.close();
      this._observations.set(handle, watcher);
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.code) {
          case ERROR_CODE.ENOENT:
            throw newNotFoundError();
          case ERROR_CODE.EACCES:
            throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  public unobserve(handle: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle): void {
    const watcher = this._observations.get(handle);
    if (!watcher) return;
    watcher.close();
    this._observations.delete(handle);
  }

  /** Disconnect and stop all observations. */
  public disconnect(): void {
    for (const watcher of this._observations.values()) watcher.close();
    this._observations.clear();
  }
}
