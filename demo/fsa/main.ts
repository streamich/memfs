(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import type * as fsa from '../../src/fsa/types';
import {fsaToNode} from '../../src/fsa-to-node';
import {SyncMessenger} from '../../src/fsa-to-node/worker/SyncMessenger';
import {encode, decode} from 'json-joy/es6/json-pack/msgpack/util';

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  const fs = fsaToNode(dir);
  const list = await fs.promises.readdir('');
  console.log(list);
  await fs.promises.writeFile('test.txt', 'Hello world!');
  await fs.promises.mkdir('storage/a/b/c', {recursive: true});
  await fs.promises.rm('storage/a/b', {recursive: true});

  
  const stream = fs.createWriteStream('stream.txt');
  stream.write('abc');
  stream.write('def');
  stream.end('ghi');

  const worker = new Worker('https://localhost:9876/worker.js');
  worker.onerror = (e) => {
    console.log("error", e);
  };

  let sab: SharedArrayBuffer | undefined = undefined;
  let channel: SyncMessenger | undefined = undefined;

  worker.onmessage = (e) => {
    const data = e.data;
    if (data && typeof data === 'object') {
      console.log('<', data);
      switch (data.type) {
        case 'init': {
          sab = data.sab;
          channel = new SyncMessenger(sab!);
          worker.postMessage({type: 'set-root', dir, id: 0});
          break;
        }
        case 'root-set': {
          console.log('READY');
          const request = encode({type: 'readdir', path: ''});
          console.log('call sync', request);
          const response = channel!.callSync(request);
          const responseDecoded = decode(response as any);
          console.log('response', responseDecoded);
          break;
        }
      }
    }
  };


  
};

const main = async () => {
  const button = document.createElement("button");
  button.textContent = "Select folder";
  document.body.appendChild(button);
  button.onclick = async () => {
    const dir = await (window as any).showDirectoryPicker({id: 'demo', mode: 'readwrite'});
    await demo(dir);
  };
};

main();
