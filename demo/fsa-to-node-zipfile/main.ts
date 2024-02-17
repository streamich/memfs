(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import type * as fsa from '../../src/fsa/types';
import { FsaNodeFs } from '../../src/fsa-to-node';
const tar = require('tar-stream');

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  const fs = new FsaNodeFs(dir);
  await fs.promises.writeFile('hello.txt', 'Hello World');
  await fs.promises.writeFile('cool.txt', 'Cool Worlds channel');

  const list = (await fs.promises.readdir('/')) as string[];

  const pack = tar.pack();
  const tarball = fs.createWriteStream('backups.tar');
  pack.pipe(tarball);

  for (const item of list) {
    if (item[0] === '.') continue;
    const stat = await fs.promises.stat(item);
    if (!stat.isFile()) continue;
    pack.entry({ name: '/backups/' + item }, await fs.promises.readFile('/' + item), () => {});
  }

  pack.finalize();
};

const main = async () => {
  const button = document.createElement('button');
  button.textContent = 'Select an empty folder';
  document.body.appendChild(button);
  button.onclick = async () => {
    const dir = await (window as any).showDirectoryPicker({ id: 'demo', mode: 'readwrite' });
    await demo(dir);
  };
};

main();
