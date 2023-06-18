import type * as opts from '../node/types/options';

export type FsLocation = [folder: string[], file: string];

/**
 * Adapter which implements synchronous calls to the FSA API.
 */
export interface FsaNodeSyncAdapterApi {
  stat(location: FsLocation): FsaNodeSyncAdapterStats;
  access(req: { filename: string; mode: number }): void;
  readFile(req: { filename: string; opts?: opts.IReadFileOptions }): Uint8Array;
  writeFile(req: { filename: string; data: Uint8Array; opts?: opts.IWriteFileOptions }): void;
  appendFile(req: { filename: string; data: Uint8Array; opts?: opts.IAppendFileOptions }): void;
}

export interface FsaNodeSyncAdapter {
  call<K extends keyof FsaNodeSyncAdapterApi>(
    method: K,
    payload: Parameters<FsaNodeSyncAdapterApi[K]>[0],
  ): ReturnType<FsaNodeSyncAdapterApi[K]>;
}

export interface FsaNodeSyncAdapterStats {
  kind: 'file' | 'directory';
  size?: number;
}
