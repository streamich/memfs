import { DenoFsEvent, DenoFsEventFlag } from './types';

export class CoreFsEvent implements DenoFsEvent {
  kind: "any" | "access" | "create" | "modify" | "rename" | "remove" | "other";
  paths: string[];
  flag?: DenoFsEventFlag;

  constructor(
    kind: "any" | "access" | "create" | "modify" | "rename" | "remove" | "other",
    paths: string[],
    flag?: DenoFsEventFlag
  ) {
    this.kind = kind;
    this.paths = paths;
    this.flag = flag;
  }
}