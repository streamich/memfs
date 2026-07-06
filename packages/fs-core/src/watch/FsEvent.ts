import type { Node } from '../Node';

export const enum FsEventType {
  CREATE,
  DELETE,
  MODIFY,
  MOVE,
}

export class FsEvent {
  constructor(
    public readonly type: FsEventType,
    public readonly steps: string[],
    public readonly node: Node,
    public readonly oldSteps: string[] | undefined = void 0,
  ) {}
}
