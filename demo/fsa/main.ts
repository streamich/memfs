(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import type * as fsa from '../../src/fsa/types';
import {FsaNodeFs, FsaNodeSyncAdapterWorker} from '../../src/fsa-to-node';

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  console.log('demo', dir);
  const adapter = await FsaNodeSyncAdapterWorker.start(dir);
  const fs = new FsaNodeFs(dir, adapter);

  await fs.promises.mkdir('/dir');
  await fs.promises.writeFile('/test.txt', 'Hello world!');
  const list = await fs.promises.readdir('');
  console.log(list);

  console.log('/test.txt', fs.statSync('/test.txt'), fs.statSync('/test.txt').isFile(), fs.statSync('/test.txt').isDirectory());
  console.log('/dir', fs.statSync('/dir'), fs.statSync('/dir').isFile(), fs.statSync('/dir').isDirectory());
  // await fs.promises.mkdir('storage/a/b/c', {recursive: true});
  // await fs.promises.rm('storage/a/b', {recursive: true});

  
  // const stream = fs.createWriteStream('stream.txt');
  // stream.write('abc');
  // stream.write('def');
  // stream.end('ghi');

  // const worker = new Worker('https://localhost:9876/worker.js');
  // worker.onerror = (e) => {
  //   console.log("error", e);
  // };

  // let sab: SharedArrayBuffer | undefined = undefined;
  // let channel: SyncMessenger | undefined = undefined;

  // worker.onmessage = (e) => {
  //   const data = e.data;
  //   if (data && typeof data === 'object') {
  //     console.log('<', data);
  //     switch (data.type) {
  //       case 'init': {
  //         sab = data.sab;
  //         channel = new SyncMessenger(sab!);
  //         worker.postMessage({type: 'set-root', dir, id: 0});
  //         break;
  //       }
  //       case 'root-set': {
  //         console.log('READY');

  //         const request = encode({type: 'readdir', path: ''});
  //         console.log('call sync', request);
  //         const response = channel!.callSync(request);
  //         const responseDecoded = decode(response as any);
  //         console.log('response', responseDecoded);
  //         console.log('READY');


  //         break;
  //       }
  //     }
  //   }
  // };


  
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
