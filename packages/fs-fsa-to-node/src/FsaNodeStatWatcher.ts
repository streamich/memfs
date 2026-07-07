import { EventEmitter } from '@jsonjoy.com/fs-node-builtins/lib/events';
import setTimeoutUnref from '@jsonjoy.com/fs-node-utils/lib/setTimeoutUnref';
import { FsaNodeStats } from './FsaNodeStats';
import { pathToLocation } from './util';
import type { TSetTimeout } from '@jsonjoy.com/fs-node-utils/lib/setTimeoutUnref';
import type * as fsa from '@jsonjoy.com/fs-fsa';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

export type FsaNodeFileResolver = (folder: string[], name: string) => Promise<fsa.IFileSystemFileHandle>;

const setTimeoutRef: TSetTimeout = (callback, time, args) => setTimeout(callback, time, ...(args || []));

/**
 * `fs.watchFile` watcher for the FSA-to-Node adapter. The FSA API has no
 * change notifications suitable for stat polling, so the file is polled at
 * `interval`: the handle's `File` is fetched and its `lastModified` and `size`
 * are compared — the pattern recommended by the Chrome `FileSystemObserver`
 * announcement for changes the observer does not cover.
 */
export class FsaNodeStatWatcher extends EventEmitter implements misc.IStatWatcher {
  public filename: string = '';
  public interval: number = 5007;
  public timeoutRef?: any;
  public setTimeout: TSetTimeout = setTimeoutRef;
  public prev: misc.IStats = new FsaNodeStats(false, 0, 'file');
  protected bigint: boolean = false;
  protected stopped: boolean = false;
  protected fileExists: boolean = false;

  constructor(protected readonly resolveFile: FsaNodeFileResolver) {
    super();
  }

  public start(path: string, persistent: boolean = true, interval: number = 5007, bigint: boolean = false): void {
    this.filename = String(path);
    this.interval = interval;
    this.bigint = bigint;
    this.stopped = false;
    if (!persistent) this.setTimeout = setTimeoutUnref;
    void this.first();
  }

  protected async first(): Promise<void> {
    const curr = await this.statSafe();
    if (this.stopped) return;
    if (curr) {
      this.fileExists = true;
      this.prev = curr;
    } else {
      this.fileExists = false;
      this.prev = this.zeroStats();
      this.emit('change', this.prev, this.prev);
    }
    this.loop();
  }

  protected loop(): void {
    if (this.stopped) return;
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    this.timeoutRef = this.setTimeout(() => void this.onInterval(), this.interval);
  }

  protected async onInterval(): Promise<void> {
    const curr = await this.statSafe();
    if (this.stopped) return;
    if (curr) {
      const reappeared = !this.fileExists;
      this.fileExists = true;
      if (reappeared || this.hasChanged(curr, this.prev)) {
        this.emit('change', curr, this.prev);
        this.prev = curr;
      }
    } else if (this.fileExists) {
      this.fileExists = false;
      this.emit('change', this.zeroStats(), this.prev);
    }
    this.loop();
  }

  protected hasChanged(curr: misc.IStats, prev: misc.IStats): boolean {
    return curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size;
  }

  protected zeroStats(): misc.IStats {
    return new FsaNodeStats(this.bigint, (this.bigint ? BigInt(0) : 0) as any, 'file');
  }

  protected async statSafe(): Promise<misc.IStats | null> {
    try {
      const [folder, name] = pathToLocation(this.filename);
      const handle = await this.resolveFile(folder, name);
      const file = await handle.getFile();
      const size = (this.bigint ? BigInt(file.size) : file.size) as any;
      return new FsaNodeStats(this.bigint, size, 'file', file.lastModified);
    } catch {
      return null;
    }
  }

  public stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = undefined;
    }
    queueMicrotask(() => this.emit('stop'));
  }

  public ref(): this {
    this.setTimeout = setTimeoutRef;
    this.timeoutRef?.ref?.();
    return this;
  }

  public unref(): this {
    this.setTimeout = setTimeoutUnref;
    this.timeoutRef?.unref?.();
    return this;
  }
}
