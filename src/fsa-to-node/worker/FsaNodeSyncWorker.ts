import { AsyncCallback, SyncMessenger } from './SyncMessenger';
import { FsaNodeWorkerMessageCode } from './constants';
import { FsaNodeFs } from '../FsaNodeFs';
import { decoder, encoder } from '../json';
import type * as fsa from '../../fsa/types';
import type {
  FsaNodeWorkerError,
  FsaNodeWorkerMsg,
  FsaNodeWorkerMsgInit,
  FsaNodeWorkerMsgRequest,
  FsaNodeWorkerMsgRootSet,
} from './types';
import type { FsLocation, FsaNodeSyncAdapterApi, FsaNodeSyncAdapterStats } from '../types';

export class FsaNodeSyncWorker {
  protected readonly sab: SharedArrayBuffer = new SharedArrayBuffer(1024 * 32);
  protected readonly messenger = new SyncMessenger(this.sab);
  protected root!: fsa.IFileSystemDirectoryHandle;
  protected fs!: FsaNodeFs;

  public start() {
    onmessage = e => {
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
        this.root = dir;
        this.fs = new FsaNodeFs(this.root);
        const response: FsaNodeWorkerMsgRootSet = [FsaNodeWorkerMessageCode.RootSet, id];
        postMessage(response);
        this.messenger.serveAsync(this.onRequest);
        break;
      }
    }
  };

  protected readonly onRequest: AsyncCallback = async (request: Uint8Array): Promise<Uint8Array> => {
    try {
      const message = decoder.decode(request as any) as FsaNodeWorkerMsgRequest;
      if (!Array.isArray(message)) throw new Error('Invalid message format');
      const code = message[0];
      if (code !== FsaNodeWorkerMessageCode.Request) throw new Error('Invalid message code');
      const [, method, payload] = message;
      const handler = this.handlers[method];
      if (!handler) throw new Error(`Unknown method ${method}`);
      const response = await handler(payload);
      return encoder.encode([FsaNodeWorkerMessageCode.Response, response]);
    } catch (err) {
      const message = err && typeof err === 'object' && err.message ? err.message : 'Unknown error';
      const error: FsaNodeWorkerError = { message };
      if (err && typeof err === 'object' && (err.code || err.name)) error.code = err.code || err.name;
      return encoder.encode([FsaNodeWorkerMessageCode.ResponseError, error]);
    }
  };

  protected async getDir(path: string[], create: boolean, funcName?: string): Promise<fsa.IFileSystemDirectoryHandle> {
    let curr: fsa.IFileSystemDirectoryHandle = this.root;
    const options: fsa.GetDirectoryHandleOptions = { create };
    try {
      for (const name of path) {
        curr = await curr.getDirectoryHandle(name, options);
      }
    } catch (error) {
      // if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
      //   throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
      throw error;
    }
    return curr;
  }

  protected async getFile(
    path: string[],
    name: string,
    funcName?: string,
    create?: boolean,
  ): Promise<fsa.IFileSystemFileHandle> {
    const dir = await this.getDir(path, false, funcName);
    const file = await dir.getFileHandle(name, { create });
    return file;
  }

  protected async getFileOrDir(
    path: string[],
    name: string,
    funcName?: string,
    create?: boolean,
  ): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle> {
    const dir = await this.getDir(path, false, funcName);
    try {
      const file = await dir.getFileHandle(name);
      return file;
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.name) {
          case 'TypeMismatchError':
            return await dir.getDirectoryHandle(name);
          // case 'NotFoundError':
          //   throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
        }
      }
      throw error;
    }
  }

  protected handlers: {
    [K in keyof FsaNodeSyncAdapterApi]: (
      request: Parameters<FsaNodeSyncAdapterApi[K]>[0],
    ) => Promise<ReturnType<FsaNodeSyncAdapterApi[K]>>;
  } = {
    stat: async (location: FsLocation): Promise<FsaNodeSyncAdapterStats> => {
      const handle = await this.getFileOrDir(location[0], location[1], 'statSync');
      return {
        kind: handle.kind,
      };
    },
    access: async ({ filename, mode }): Promise<void> => {
      await this.fs.promises.access(filename, mode);
    },
    readFile: async ({ filename, opts }): Promise<Uint8Array> => {
      const buf = (await this.fs.promises.readFile(filename, { ...opts, encoding: 'buffer' })) as Buffer;
      const uint8 = new Uint8Array(buf, buf.byteOffset, buf.byteLength);
      return uint8;
    },
    writeFile: async ({ filename, data, opts }): Promise<void> => {
      await this.fs.promises.writeFile(filename, data, { ...opts, encoding: 'buffer' });
    },
  };
}
