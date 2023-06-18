export type FsLocation = [folder: string[], file: string];

/**
 * Adapter which implements synchronous calls to the FSA API.
 */
export interface FsaNodeSyncAdapterApi {
  stat(location: FsLocation): FsaNodeSyncAdapterStats;
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
