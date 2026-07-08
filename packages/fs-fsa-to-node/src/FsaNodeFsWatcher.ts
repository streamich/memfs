import { EventEmitter } from '@jsonjoy.com/fs-node-builtins/lib/events';
import { strToEncoding, watchIgnoreToMatcher } from '@jsonjoy.com/fs-node-utils';
import { pathToLocation } from './util';
import { FsaToNodeConstants } from './constants';
import type * as fsa from '@jsonjoy.com/fs-fsa';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';
import type * as opts from '@jsonjoy.com/fs-node-utils/lib/types/options';

export type FsaNodeWatchHandleResolver = (
  folder: string[],
  name: string,
) => Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle>;

/**
 * `fs.watch` watcher for the FSA-to-Node adapter, powered by a
 * `FileSystemObserver`. The observer backend is asynchronous, so startup
 * errors (e.g. the watched path does not exist) are emitted as an `'error'`
 * event on the watcher, instead of being thrown synchronously the way the
 * Node.js API does. For the same reason `throwIfNoEntry: false` suppresses
 * the asynchronous ENOENT `'error'` event, leaving a never-started watcher
 * whose `close()` is a silent no-op, mirroring what `fs.watch` returns.
 */
export class FsaNodeFsWatcher extends EventEmitter implements misc.IFSWatcher {
  protected observer: fsa.IFileSystemObserver | undefined;
  protected closed: boolean = false;
  protected encoding: BufferEncoding = 'utf8';
  protected filename: string = '';
  protected basename: string = '';
  private _ignore: ((filename: string) => boolean) | undefined;

  constructor(
    protected readonly Observer: fsa.IFileSystemObserverConstructable,
    protected readonly resolveHandle: FsaNodeWatchHandleResolver,
  ) {
    super();
  }

  public start(
    path: misc.PathLike,
    persistent: boolean = true,
    recursive: boolean = false,
    encoding: BufferEncoding = 'utf8',
    ignore?: opts.TWatchIgnorePattern | opts.TWatchIgnorePattern[],
    throwIfNoEntry?: boolean,
  ): void {
    this.filename = String(path);
    this.encoding = encoding;
    this._ignore = ignore === undefined ? undefined : watchIgnoreToMatcher(ignore);
    const [folder, name] = pathToLocation(this.filename);
    this.basename = name;
    const observer = new this.Observer(records => this.onRecords(records));
    this.observer = observer;
    this.resolveHandle(folder, name)
      .then(async handle => {
        if (this.closed) return;
        await observer.observe(handle, { recursive });
        if (this.closed) observer.disconnect();
      })
      .catch(error => {
        if (this.closed) return;
        const code = error && typeof error === 'object' ? error.code : undefined;
        if (throwIfNoEntry === false && code === 'ENOENT') {
          this.closed = true;
          this.observer = undefined;
          return;
        }
        this.close();
        const wrapped = new Error(`watch ${this.filename} ${code ?? ''}`.trimEnd());
        (wrapped as any).code = code;
        this.emit('error', wrapped);
      });
  }

  protected onRecords(records: fsa.IFileSystemChangeRecord[]): void {
    if (this.closed) return;
    for (const record of records) {
      switch (record.type) {
        case 'appeared':
        case 'disappeared':
          this._emit('rename', record.relativePathComponents);
          break;
        case 'moved':
          if (record.relativePathMovedFrom) this._emit('rename', record.relativePathMovedFrom);
          this._emit('rename', record.relativePathComponents);
          break;
        case 'modified':
          this._emit('change', record.relativePathComponents);
          break;
        case 'errored':
          this._emit('rename', record.relativePathComponents);
          this.close();
          return;
      }
    }
  }

  private _emit(type: 'rename' | 'change', steps: string[]): void {
    const filename = steps.length ? steps.join(FsaToNodeConstants.Separator) : this.basename;
    if (this._ignore && this._ignore(filename)) return;
    this.emit('change', type, strToEncoding(filename, this.encoding));
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;
    this.observer?.disconnect();
    this.observer = undefined;
    queueMicrotask(() => this.emit('close'));
  }

  public ref(): this {
    return this;
  }

  public unref(): this {
    return this;
  }
}
