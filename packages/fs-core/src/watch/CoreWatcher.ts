import { FanOut } from 'thingies/lib/fanout';
import { FsEvent, FsEventType } from './FsEvent';
import type { Link } from '../Link';
import type { Node } from '../Node';
import type { Superblock } from '../Superblock';

export interface CoreWatchOptions {
  /**
   * When `true`, the whole subtree of the watch target is observed. Otherwise
   * only the target itself and its direct children are (FSA depth-1 and inotify
   * semantics).
   */
  recursive?: boolean;

  /**
   * Resolve symlinks when locating the watch target, like `fs.watch` does.
   * When `false`, the symlink itself is watched. Default `true`.
   */
  follow?: boolean;
}

/**
 * A change event scoped to a {@link CoreWatcher} watch root. Unlike the
 * volume-global {@link FsEvent}, `steps` (and `oldSteps`) are relative to the
 * watch root; an empty `steps` array means the watch target itself changed.
 */
export class CoreWatchEvent {
  constructor(
    public readonly type: FsEventType,
    /** Path relative to the watch root, empty for the watch target itself. */
    public readonly steps: string[],
    public readonly node: Node,
    public readonly link: Link,
    /** Former path relative to the watch root, set only for in-scope moves. */
    public readonly oldSteps: string[] | undefined = void 0,
  ) {}
}

/**
 * Subscribes to a {@link Superblock} change stream and re-emits only the
 * events that fall within the scope of one watched file or directory, with
 * paths rewritten to be relative to the watch root.
 *
 * Scope-boundary crossing moves are translated: a move into scope is emitted
 * as `CREATE`, a move out of scope as `DELETE`, and a move within scope stays
 * a `MOVE` carrying relative `oldSteps`. A `MOVE` with empty `steps` means the
 * watch target itself was renamed; watching continues at the new location
 * (the current absolute path is always `watcher.link.steps`). A `DELETE` with
 * empty `steps` is terminal: the watch target is gone and the watcher closes
 * itself after delivering it.
 */
export class CoreWatcher {
  /** The link of the watch target; `link.steps` stays current across renames. */
  public readonly link: Link;
  /** The node the watch target pointed to when watching started. */
  public readonly node: Node;
  /** Fan-out of scoped change events. Multiple consumers may subscribe. */
  public readonly changes = new FanOut<CoreWatchEvent>();
  private readonly recursive: boolean;
  private unsub: (() => void) | undefined;

  /** @throws ENOENT-style error when the watch target does not exist. */
  constructor(core: Superblock, path: string, opts: CoreWatchOptions = {}) {
    this.link = (opts.follow ?? true) ? core.getResolvedLinkOrThrow(path, 'watch') : core.getLinkOrThrow(path, 'watch');
    this.node = this.link.getNode();
    this.recursive = !!opts.recursive;
    this.unsub = core.changes.listen(event => this.onEvent(event));
  }

  public get closed(): boolean {
    return !this.unsub;
  }

  private onEvent(event: FsEvent): void {
    const rootLength = this.link.steps.length;
    const isSelf =
      event.link === this.link ||
      (event.node === this.node && (event.type === FsEventType.MODIFY || event.type === FsEventType.ATTRIB));
    if (isSelf) {
      this.changes.emit(new CoreWatchEvent(event.type, [], event.node, this.link));
      if (event.type === FsEventType.DELETE) this.close();
      return;
    }
    if (event.type === FsEventType.MOVE) {
      const from = event.oldSteps && this.inScope(event.oldSteps) ? event.oldSteps.slice(rootLength) : undefined;
      const to = this.inScope(event.steps) ? event.steps.slice(rootLength) : undefined;
      if (from && to) this.changes.emit(new CoreWatchEvent(FsEventType.MOVE, to, event.node, event.link, from));
      else if (from) this.changes.emit(new CoreWatchEvent(FsEventType.DELETE, from, event.node, event.link));
      else if (to) this.changes.emit(new CoreWatchEvent(FsEventType.CREATE, to, event.node, event.link));
      return;
    }
    if (this.inScope(event.steps))
      this.changes.emit(new CoreWatchEvent(event.type, event.steps.slice(rootLength), event.node, event.link));
  }

  private inScope(steps: string[]): boolean {
    const root = this.link.steps;
    if (steps.length <= root.length) return false;
    if (!this.recursive && steps.length !== root.length + 1) return false;
    for (let i = 0; i < root.length; i++) if (steps[i] !== root[i]) return false;
    return true;
  }

  /** Stop watching and unsubscribe from the volume change stream. */
  public close(): void {
    this.unsub?.();
    this.unsub = undefined;
  }
}
