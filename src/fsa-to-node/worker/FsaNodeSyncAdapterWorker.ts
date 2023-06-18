import {Defer} from 'thingies/es6/Defer';
import {FsaNodeWorkerMessageCode} from './constants';
import {encode, decode} from 'json-joy/es6/json-pack/msgpack/util';
import {SyncMessenger} from "./SyncMessenger";
import type * as fsa from '../../fsa/types';
import type {FsLocation, FsaNodeSyncAdapter, FsaNodeSyncAdapterStats} from "../types";
import type {FsaNodeWorkerMsg, FsaNodeWorkerMsgInit, FsaNodeWorkerMsgRootSet, FsaNodeWorkerMsgSetRoot} from "./types";

let rootId = 0;

export class FsaNodeSyncAdapterWorker implements FsaNodeSyncAdapter {
  public static async start(dir: fsa.IFileSystemDirectoryHandle): Promise<FsaNodeSyncAdapterWorker> {
    const worker = new Worker('https://localhost:9876/worker.js');
    const future = new Defer<FsaNodeSyncAdapterWorker>();
    let id = rootId++;
    let messenger: SyncMessenger | undefined = undefined;
    worker.onmessage = (e) => {
      const data = e.data;
      if (!Array.isArray(data)) return;
      console.log('<', data);
      const msg = data as FsaNodeWorkerMsg;
      const code = msg[0] as FsaNodeWorkerMessageCode;
      switch (code) {
        case FsaNodeWorkerMessageCode.Init: {
          const [, sab] = msg as FsaNodeWorkerMsgInit;
          messenger = new SyncMessenger(sab);
          const setRootMessage: FsaNodeWorkerMsgSetRoot = [FsaNodeWorkerMessageCode.SetRoot, id, dir];
          worker.postMessage(setRootMessage);
          break;
        }
        case FsaNodeWorkerMessageCode.RootSet: {
          const [, rootId] = msg as FsaNodeWorkerMsgRootSet;
          if (id !== rootId) return;
          const adapter = new FsaNodeSyncAdapterWorker(messenger!, id, dir);
          future.resolve(adapter);
          break;
        }
      }
    };
    return await future.promise;
  }

  public constructor(protected readonly messenger: SyncMessenger, protected readonly id: number, protected readonly root: fsa.IFileSystemDirectoryHandle) {
    
  }

  public call(msg: FsaNodeWorkerMsg): unknown {
    const request = encode(msg);
    const response = this.messenger.callSync(request);
    const resposeMsg = decode<FsaNodeWorkerMsg>(response as any);
    switch (resposeMsg[0]) {
      case FsaNodeWorkerMessageCode.Response: {
        const [, responseData] = resposeMsg;
        return responseData;
        break;
      }
      case FsaNodeWorkerMessageCode.ResponseError: {
        const [, error] = resposeMsg;
        throw error;
        break;
      }
      default: {
        throw new Error('Invalid response message code');
      }
    }
  }

  public stat(location: FsLocation): FsaNodeSyncAdapterStats {
    return this.call([FsaNodeWorkerMessageCode.Stat, location]) as FsaNodeSyncAdapterStats;
  }
}
