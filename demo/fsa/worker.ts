import {FsaNodeSyncWorker} from "../../src/fsa-to-node/worker/FsaNodeSyncWorker";

if (typeof window === 'undefined') {
  const worker = new FsaNodeSyncWorker();
  worker.start();
}
