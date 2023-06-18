(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import {strictEqual} from 'assert';

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

  console.log('existsSync()');
  strictEqual(fs.existsSync('/test.txt'), true);
  
  console.log('statSync() - returns correct type for file');
  strictEqual(fs.statSync('/test.txt').isFile(), true);
  strictEqual(fs.statSync('/test.txt').isDirectory(), false);
  
  console.log('statSync() - returns correct type for directory');
  strictEqual(fs.statSync('/dir').isFile(), false);
  strictEqual(fs.statSync('/dir').isDirectory(), true);
  
  console.log('readFileSync() - can read file as text');
  strictEqual(fs.readFileSync('/test.txt', 'utf8'), 'Hello world!');
  
  console.log('writeFileSync() - can write text to a new file');
  fs.writeFileSync('/cool.txt', 'worlds');
  strictEqual(fs.readFileSync('/cool.txt', 'utf8'), 'worlds');
  
  console.log('appendFileSync() - can append to an existing file');
  fs.appendFileSync('/cool.txt', '!');
  strictEqual(fs.readFileSync('/cool.txt', 'utf8'), 'worlds!');
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
