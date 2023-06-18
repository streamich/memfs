import {AsyncCallback, SyncMessenger} from "./SyncMessenger";
import {encode, decode} from 'json-joy/es6/json-pack/msgpack/util';
import {FsaNodeWorkerMessageCode} from "./constants";
import type * as fsa from '../../fsa/types';
import type {FsaNodeWorkerError, FsaNodeWorkerMsg, FsaNodeWorkerMsgInit, FsaNodeWorkerMsgRootSet} from "./types";
import type {FsaNodeSyncAdapterStats} from "../types";

export class FsaNodeSyncWorker {
  protected readonly sab: SharedArrayBuffer = new SharedArrayBuffer(1024 * 32);
  protected readonly messenger = new SyncMessenger(this.sab);
  protected readonly roots = new Map<number, fsa.IFileSystemDirectoryHandle>();

  protected readonly onCall: AsyncCallback = (request: Uint8Array): Promise<Uint8Array> => {
    throw new Error('Not implemented');
  };

  public start() {
    onmessage = (e) => {
      if (!Array.isArray(e.data)) return;
      console.log('>', e.data);
      this.onPostMessage(e.data as FsaNodeWorkerMsg);
    };
    const initMsg: FsaNodeWorkerMsgInit = [FsaNodeWorkerMessageCode.Init, this.sab];
    postMessage(initMsg);
  }

  protected onPostMessage = (msg: FsaNodeWorkerMsg): void => {
    switch (msg[0]) {
      case FsaNodeWorkerMessageCode.SetRoot: {
        const [, id, dir] = msg;
        this.roots.set(id, dir);
        const response: FsaNodeWorkerMsgRootSet = [FsaNodeWorkerMessageCode.RootSet, id];
        postMessage(response);
        this.messenger.serveAsync(this.onRequest);
        break;
      }
    }
  };

  protected readonly onRequest: AsyncCallback = async (request: Uint8Array): Promise<Uint8Array> => {
    try {
      const message = decode(request as any) as FsaNodeWorkerMsg;
      if (!Array.isArray(message)) throw new Error('Invalid message format');
      const code = message[0];
      const handler = this.handlers[code];
      if (!handler) throw new Error('Invalid message code');
      const response = await handler(message);
      return encode([FsaNodeWorkerMessageCode.Response, response]);
    } catch (err) {
      const message = err && typeof err === 'object' && err.message ? err.message : 'Unknown error';
      const error: FsaNodeWorkerError = {message};
      if (err && typeof err === 'object' && err.code) error.code = err.code;
      return encode([FsaNodeWorkerMessageCode.ResponseError, error]);
    }
  };

  protected handlers: Record<number, (msg: FsaNodeWorkerMsg) => Promise<unknown>> = {
    [FsaNodeWorkerMessageCode.Stat]: async (msg: FsaNodeWorkerMsg): Promise<FsaNodeSyncAdapterStats> => {
      return {
        kind: 'directory',
      };
    },
  };
}
