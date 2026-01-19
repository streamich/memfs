import { Defer } from 'thingies/lib/Defer';
import { FsaNodeWorkerMessageCode } from './constants';
import { SyncMessenger } from './SyncMessenger';
import { decoder, encoder } from '../json';
import type * as fsa from '../../fsa/types';
import type { FsaNodeSyncAdapter, FsaNodeSyncAdapterApi } from '../types';
import type {
  FsaNodeWorkerMsg,
  FsaNodeWorkerMsgInit,
  FsaNodeWorkerMsgRequest,
  FsaNodeWorkerMsgResponse,
  FsaNodeWorkerMsgResponseError,
  FsaNodeWorkerMsgRootSet,
  FsaNodeWorkerMsgSetRoot,
} from './types';

let rootId = 0;

export class FsaNodeSyncAdapterWorker implements FsaNodeSyncAdapter {
  public static async start(
    url: string,
    dir: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>,
  ): Promise<FsaNodeSyncAdapterWorker> {
    const worker = new Worker(url);
    const future = new Defer<FsaNodeSyncAdapterWorker>();
    let id = rootId++;
    let messenger: SyncMessenger | undefined = undefined;
    const _dir = await dir;
    worker.onmessage = e => {
      const data = e.data;
      if (!Array.isArray(data)) return;
      const msg = data as FsaNodeWorkerMsg;
      const code = msg[0] as FsaNodeWorkerMessageCode;
      switch (code) {
        case FsaNodeWorkerMessageCode.Init: {
          const [, sab] = msg as FsaNodeWorkerMsgInit;
          messenger = new SyncMessenger(sab);
          const setRootMessage: FsaNodeWorkerMsgSetRoot = [FsaNodeWorkerMessageCode.SetRoot, id, _dir];
          worker.postMessage(setRootMessage);
          break;
        }
        case FsaNodeWorkerMessageCode.RootSet: {
          const [, rootId] = msg as FsaNodeWorkerMsgRootSet;
          if (id !== rootId) return;
          const adapter = new FsaNodeSyncAdapterWorker(messenger!, _dir);
          future.resolve(adapter);
          break;
        }
      }
    };
    return await future.promise;
  }

  public constructor(
    protected readonly messenger: SyncMessenger,
    protected readonly root: fsa.IFileSystemDirectoryHandle,
  ) {}

  public call<K extends keyof FsaNodeSyncAdapterApi>(
    method: K,
    payload: Parameters<FsaNodeSyncAdapterApi[K]>[0],
  ): ReturnType<FsaNodeSyncAdapterApi[K]> {
    const request: FsaNodeWorkerMsgRequest = [FsaNodeWorkerMessageCode.Request, method, payload];
    const encoded = encoder.encode(request);
    const encodedResponse = this.messenger.callSync(encoded);
    type MsgBack = FsaNodeWorkerMsgResponse | FsaNodeWorkerMsgResponseError;
    const [code, data] = decoder.decode(encodedResponse) as MsgBack;
    switch (code) {
      case FsaNodeWorkerMessageCode.Response:
        return data as any;
      case FsaNodeWorkerMessageCode.ResponseError:
        throw data;
      default: {
        throw new Error('Invalid response message code');
      }
    }
  }
}
