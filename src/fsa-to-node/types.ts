export type FsLocation = [folder: string[], file: string];

/**
 * Adapter which implements synchronous calls to the FSA API.
 */
export interface FsaNodeSyncAdapter {
  stat(location: FsLocation): FsaNodeSyncAdapterStats;
}

export interface FsaNodeSyncAdapterStats {
  kind: 'file' | 'directory';
  size?: number;
}
