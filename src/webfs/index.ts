(<any>self).process = require('process/browser');

import { FsaNodeFs, FsaNodeSyncAdapterWorker } from '../fsa-to-node';
import { FsaNodeSyncWorker } from '../../src/fsa-to-node/worker/FsaNodeSyncWorker';
import type { IFileSystemDirectoryHandle } from '../fsa/types';

if (typeof window === 'object') {
  const url = (<any>document.currentScript).src;
  const dir = navigator.storage.getDirectory() as unknown as Promise<IFileSystemDirectoryHandle>;
  const fs = ((<any>window).fs = new FsaNodeFs(dir));
  if (url) {
    FsaNodeSyncAdapterWorker.start(url, dir)
      .then(adapter => {
        fs.syncAdapter = adapter;
      })
      .catch(() => {});
  }
} else {
  const worker = new FsaNodeSyncWorker();
  worker.start();
}
