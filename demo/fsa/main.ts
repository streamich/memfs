(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import type * as fsa from '../../src/fsa/types';
import {fsaToNode} from '../../src/fsa-to-node';

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
