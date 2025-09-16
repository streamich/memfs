import {Superblock} from "../core";
import type {
  DenoFs,
  DenoMkdirOptions,
  DenoOpenOptions,
  DenoFsFile,
  DenoMakeTempOptions,
  DenoRemoveOptions,
  DenoReadFileOptions,
  DenoWriteFileOptions,
  DenoFileInfo,
  DenoDirEntry,
  DenoSymlinkOptions,
  DenoFsWatcher
} from "./types";

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

  public readonly mkdirSync = (path: string | URL, options?: DenoMkdirOptions): void => {
    throw new Error('Not implemented');
  };

  public readonly link = async (oldpath: string, newpath: string): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly linkSync = (oldpath: string, newpath: string): void => {
    throw new Error('Not implemented');
  };

  public readonly open = async (path: string | URL, options?: DenoOpenOptions): Promise<DenoFsFile> => {
    throw new Error('Not implemented');
  };

  public readonly openSync = (path: string | URL, options?: DenoOpenOptions): DenoFsFile => {
    throw new Error('Not implemented');
  };

  public readonly create = async (path: string | URL): Promise<DenoFsFile> => {
    throw new Error('Not implemented');
  };

  public readonly createSync = (path: string | URL): DenoFsFile => {
    throw new Error('Not implemented');
  };

  public readonly makeTempDir = async (options?: DenoMakeTempOptions): Promise<string> => {
    throw new Error('Not implemented');
  };

  public readonly makeTempDirSync = (options?: DenoMakeTempOptions): string => {
    throw new Error('Not implemented');
  };

  public readonly makeTempFile = async (options?: DenoMakeTempOptions): Promise<string> => {
    throw new Error('Not implemented');
  };

  public readonly makeTempFileSync = (options?: DenoMakeTempOptions): string => {
    throw new Error('Not implemented');
  };

  public readonly chmod = async (path: string | URL, mode: number): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly chmodSync = (path: string | URL, mode: number): void => {
    throw new Error('Not implemented');
  };

  public readonly chown = async (path: string | URL, uid: number | null, gid: number | null): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly chownSync = (path: string | URL, uid: number | null, gid: number | null): void => {
    throw new Error('Not implemented');
  };

  public readonly remove = async (path: string | URL, options?: DenoRemoveOptions): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly removeSync = (path: string | URL, options?: DenoRemoveOptions): void => {
    throw new Error('Not implemented');
  };

  public readonly rename = async (oldpath: string | URL, newpath: string | URL): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly renameSync = (oldpath: string | URL, newpath: string | URL): void => {
    throw new Error('Not implemented');
  };

  public readonly readTextFile = async (path: string | URL, options?: DenoReadFileOptions): Promise<string> => {
    throw new Error('Not implemented');
  };

  public readonly readTextFileSync = (path: string | URL): string => {
    throw new Error('Not implemented');
  };

  public readonly readFile = async (path: string | URL, options?: DenoReadFileOptions): Promise<Uint8Array> => {
    throw new Error('Not implemented');
  };

  public readonly readFileSync = (path: string | URL): Uint8Array => {
    throw new Error('Not implemented');
  };

  public readonly realPath = async (path: string | URL): Promise<string> => {
    throw new Error('Not implemented');
  };

  public readonly realPathSync = (path: string | URL): string => {
    throw new Error('Not implemented');
  };

  public readonly readDir = (path: string | URL): AsyncIterable<DenoDirEntry> => {
    throw new Error('Not implemented');
  };

  public readonly readDirSync = (path: string | URL): IterableIterator<DenoDirEntry> => {
    throw new Error('Not implemented');
  };

  public readonly copyFile = async (fromPath: string | URL, toPath: string | URL): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly copyFileSync = (fromPath: string | URL, toPath: string | URL): void => {
    throw new Error('Not implemented');
  };

  public readonly readLink = async (path: string | URL): Promise<string> => {
    throw new Error('Not implemented');
  };

  public readonly readLinkSync = (path: string | URL): string => {
    throw new Error('Not implemented');
  };

  public readonly lstat = async (path: string | URL): Promise<DenoFileInfo> => {
    throw new Error('Not implemented');
  };

  public readonly lstatSync = (path: string | URL): DenoFileInfo => {
    throw new Error('Not implemented');
  };

  public readonly stat = async (path: string | URL): Promise<DenoFileInfo> => {
    throw new Error('Not implemented');
  };

  public readonly statSync = (path: string | URL): DenoFileInfo => {
    throw new Error('Not implemented');
  };

  public readonly writeFile = async (path: string | URL, data: Uint8Array | ReadableStream<Uint8Array>, options?: DenoWriteFileOptions): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly writeFileSync = (path: string | URL, data: Uint8Array, options?: DenoWriteFileOptions): void => {
    throw new Error('Not implemented');
  };

  public readonly writeTextFile = async (path: string | URL, data: string | ReadableStream<string>, options?: DenoWriteFileOptions): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly writeTextFileSync = (path: string | URL, data: string, options?: DenoWriteFileOptions): void => {
    throw new Error('Not implemented');
  };

  public readonly truncate = async (name: string, len?: number): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly truncateSync = (name: string, len?: number): void => {
    throw new Error('Not implemented');
  };

  public readonly symlink = async (oldpath: string | URL, newpath: string | URL, options?: DenoSymlinkOptions): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly symlinkSync = (oldpath: string | URL, newpath: string | URL, options?: DenoSymlinkOptions): void => {
    throw new Error('Not implemented');
  };

  public readonly utimeSync = (path: string | URL, atime: number | Date, mtime: number | Date): void => {
    throw new Error('Not implemented');
  };

  public readonly utime = async (path: string | URL, atime: number | Date, mtime: number | Date): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly watchFs = (paths: string | string[], options?: { recursive: boolean }): DenoFsWatcher => {
    throw new Error('Not implemented');
  };

  public readonly umask = (mask?: number): number => {
    throw new Error('Not implemented');
  };
}
