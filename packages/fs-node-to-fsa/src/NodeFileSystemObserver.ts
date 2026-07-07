import { FileSystemChangeRecord } from '@jsonjoy.com/fs-fsa';
import { NodeFileSystemDirectoryHandle } from './NodeFileSystemDirectoryHandle';
import { NodeFileSystemFileHandle } from './NodeFileSystemFileHandle';
import { newNotAllowedError, newNotFoundError } from './util';
import type {
  IFileSystemChangeRecord,
  IFileSystemDirectoryHandle,
  IFileSystemFileHandle,
  IFileSystemHandle,
  IFileSystemObserver,
  IFileSystemObserverObserveOptions,
  IFileSystemSyncAccessHandle,
} from '@jsonjoy.com/fs-fsa';
import type { FsCallbackApi } from '@jsonjoy.com/fs-node-utils';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';
import type { NodeFsaContext, NodeFsaFs } from './types';

export type NodeFsaWatchFs = NodeFsaFs & Pick<FsCallbackApi, 'watch'>;

/**
 * A `FileSystemObserver` implementation backed by the underlying Node.js-like
 * `fs.watch`. This is a best-effort profile, per the File System Observer
 * proposal's allowance for local file systems: `rename` events are classified
 * into `"appeared"`/`"disappeared"` records by stat-ing the path, no
 * `"moved"` records are ever produced (pairing renames is unreliable — same
 * as Chrome on Windows), and a backend watcher error surfaces as a terminal
 * `"errored"` record for that observation.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
 */
export class NodeFileSystemObserver implements IFileSystemObserver {
  protected readonly _observations = new Map<
    IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    misc.IFSWatcher
  >();
  protected _records: IFileSystemChangeRecord[] = [];
  protected _flushScheduled: boolean = false;

  constructor(
    protected readonly fs: NodeFsaWatchFs,
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
    const isTrimmableSeparator = path.length > 1 && (last === '/' || last === '\\') && path[path.length - 2] !== ':';
    const target = isTrimmableSeparator ? path.slice(0, -1) : path;
    try {
      await this.fs.promises.stat(target);
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'ENOENT':
            throw newNotFoundError();
          case 'EACCES':
          case 'EPERM':
            throw newNotAllowedError();
        }
      }
      throw error;
    }
    const ctx = (handle as any).ctx as NodeFsaContext;
    const recursive = isDirectory && !!options?.recursive;
    const watcher = this.fs.watch(target, { recursive }, (eventType, filename) => {
      void this.onEvent(handle, watcher, target, isDirectory, ctx, eventType, filename ? String(filename) : '');
    });
    watcher.on('error', () => {
      if (this._observations.get(handle) === watcher) this._observations.delete(handle);
      watcher.close();
      this._enqueue(new FileSystemChangeRecord(handle, 'errored', null, []));
    });
    this._observations.get(handle)?.close();
    this._observations.set(handle, watcher);
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

  protected async onEvent(
    root: IFileSystemFileHandle | IFileSystemDirectoryHandle | IFileSystemSyncAccessHandle,
    watcher: misc.IFSWatcher,
    rootPath: string,
    isDirectory: boolean,
    ctx: NodeFsaContext,
    eventType: string,
    filename: string,
  ): Promise<void> {
    const sep = ctx.separator;
    const steps = isDirectory && filename ? filename.split(sep) : [];
    const absolute = isDirectory ? (rootPath === sep ? rootPath + filename : rootPath + sep + filename) : rootPath;
    let stats: misc.IStats | null = null;
    try {
      stats = (await this.fs.promises.stat(absolute)) as misc.IStats;
    } catch {
      stats = null;
    }
    if (this._observations.get(root) !== watcher) return;
    if (eventType === 'rename') {
      if (stats) {
        this._enqueue(new FileSystemChangeRecord(root, 'appeared', this._handle(absolute, stats, ctx), steps));
      } else {
        this._enqueue(new FileSystemChangeRecord(root, 'disappeared', null, steps));
      }
    } else if (stats) {
      this._enqueue(new FileSystemChangeRecord(root, 'modified', this._handle(absolute, stats, ctx), steps));
    }
  }

  protected _handle(absolute: string, stats: misc.IStats, ctx: NodeFsaContext): IFileSystemHandle {
    return stats.isDirectory()
      ? new NodeFileSystemDirectoryHandle(this.fs, absolute, ctx)
      : new NodeFileSystemFileHandle(this.fs, absolute, ctx);
  }

  protected _enqueue(record: IFileSystemChangeRecord): void {
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
