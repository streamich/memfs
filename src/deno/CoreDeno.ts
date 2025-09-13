import {Superblock} from "../core";
import type {DenoFs, DenoMkdirOptions} from "./types";

export class CoreDeno implements DenoFs {
  constructor(
    public readonly _core: Superblock = new Superblock(),
  ) {}

  public readonly mkdir = async (path: string | URL, options?: DenoMkdirOptions): Promise<void> => {
    const pathname = path instanceof URL ? path.pathname : path;
    const mode = options?.mode ?? 0o777;
    const recursive = options?.recursive ?? false;
    if (recursive) this._core.mkdirp(pathname, mode);
    else this._core.mkdir(pathname, mode);
  };
}
