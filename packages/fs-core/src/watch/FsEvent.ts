import type { Node } from '../Node';
import type { Link } from '../Link';

export const enum FsEventType {
  /** A directory entry appeared: file, directory, symlink, or new hard link. */
  CREATE,
  /** A directory entry was removed. */
  DELETE,
  /** File content changed (write, truncate). */
  MODIFY,
  /** File metadata changed: permissions, ownership, or timestamps. */
  ATTRIB,
  /** An entry was renamed/moved within the tree. */
  MOVE,
}

export class FsEvent {
  constructor(
    public readonly type: FsEventType,
    public readonly steps: string[],
    public readonly node: Node,
    public readonly link: Link,
    public readonly oldSteps: string[] | undefined = void 0,
  ) {}
}
