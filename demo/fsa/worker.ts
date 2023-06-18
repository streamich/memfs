import {SyncMessenger} from "../../src/fsa-to-node/worker/SyncMessenger";
import {encode, decode} from 'json-joy/es6/json-pack/msgpack/util';
import {IFileSystemDirectoryHandle} from "../../src/fsa/types";

const sab: SharedArrayBuffer = new SharedArrayBuffer(1024 * 32);
const messenger = new SyncMessenger(sab);

onmessage = (e) => {
  const data = e.data;
  console.log('>', data);
  if (data && typeof data === 'object') {
    switch (data.type) {
      case 'set-root': {
        postMessage({type: 'root-set', id: data.id});
        const dir = data.dir as IFileSystemDirectoryHandle;
        messenger.serveAsync(async (request) => {
          const message = decode(request as any);
          const list: string[] = [];
          for await (const key of dir.keys()) {
            list.push(key);
          }
          return encode(list);
        });
        break;
      }
    }
  }
};

postMessage({type: 'init', sab});
