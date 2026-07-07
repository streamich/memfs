import { CoreFileSystemDirectoryHandle } from './CoreFileSystemDirectoryHandle';
import { CoreFileSystemFileHandle } from './CoreFileSystemFileHandle';
import { newNotAllowedError, newNotFoundError } from './util';
import { CoreWatcher, ERROR_CODE, FsEventType } from '@jsonjoy.com/fs-core';
import type { CoreWatchEvent, Superblock } from '@jsonjoy.com/fs-core';
import type {
  CoreFsaContext,
  IFileSystemChangeRecord,
  IFileSystemDirectoryHandle,
  IFileSystemFileHandle,
  IFileSystemHandle,
  IFileSystemObserver,
  IFileSystemObserverObserveOptions,
  IFileSystemSyncAccessHandle,
} from './types';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemChangeRecord
 */
export class FileSystemChangeRecord implements IFileSystemChangeRecord {
  constructor(
    public readonly root: IFileSystemHandle | IFileSystemSyncAccessHandle | IFileSystemDirectoryHandle,
    public readonly type: IFileSystemChangeRecord['type'],
    public readonly changedHandle: IFileSystemHandle | IFileSystemSyncAccessHandle | IFileSystemDirectoryHandle | null,
    public readonly relativePathComponents: string[],
    public readonly relativePathMovedFrom: string[] | null = null,
  ) {}
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
 */
export class CoreFileSystemObserver implements IFileSystemObserver {
  protected readonly _observations = new Map<
    IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    CoreWatcher
  >();
  protected _records: IFileSystemChangeRecord[] = [];
  protected _flushScheduled: boolean = false;

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
    const ctx = ((handle as any).ctx ?? (handle as any)._ctx) as CoreFsaContext;
    try {
      const watcher = new CoreWatcher(this._core, target, { recursive: isDirectory && !!options?.recursive });
      watcher.changes.listen(event => this._onEvent(event, handle, watcher, ctx));
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
    this._records = [];
  }

  private _onEvent(
    event: CoreWatchEvent,
    root: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    watcher: CoreWatcher,
    ctx: CoreFsaContext,
  ): void {
    let type: IFileSystemChangeRecord['type'];
    let changedHandle: IFileSystemHandle | null = null;
    let relativePathMovedFrom: string[] | null = null;
    switch (event.type) {
      case FsEventType.CREATE:
        type = 'appeared';
        changedHandle = this._changedHandle(event, watcher, ctx);
        break;
      case FsEventType.DELETE:
        if (!event.steps.length) {
          type = 'errored';
          if (this._observations.get(root) === watcher) this._observations.delete(root);
        } else {
          type = 'disappeared';
        }
        break;
      case FsEventType.MOVE:
        type = 'moved';
        changedHandle = this._changedHandle(event, watcher, ctx);
        relativePathMovedFrom = event.oldSteps ?? null;
        break;
      default:
        type = 'modified';
        changedHandle = this._changedHandle(event, watcher, ctx);
    }
    this._enqueue(new FileSystemChangeRecord(root, type, changedHandle, event.steps, relativePathMovedFrom));
  }

  private _changedHandle(event: CoreWatchEvent, watcher: CoreWatcher, ctx: CoreFsaContext): IFileSystemHandle {
    const sep = ctx.separator;
    const path = watcher.link.steps.concat(event.steps).join(sep) || sep;
    return event.node.isDirectory()
      ? new CoreFileSystemDirectoryHandle(this._core, path, ctx)
      : new CoreFileSystemFileHandle(this._core, path, ctx);
  }

  private _enqueue(record: IFileSystemChangeRecord): void {
    this._records.push(record);
    if (this._flushScheduled) return;
    this._flushScheduled = true;
    queueMicrotask(() => {
      this._flushScheduled = false;
      const records = this._records;
      this._records = [];
      if (records.length) this.callback(records, this);
    });
  }
}
