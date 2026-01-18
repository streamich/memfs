(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import { strictEqual, deepEqual } from 'assert';

import type * as fsa from '../../src/fsa/types';
import { FsaNodeFs, FsaNodeSyncAdapterWorker } from '../../src/fsa-to-node';

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  const adapter = await FsaNodeSyncAdapterWorker.start('https://localhost:9876/worker.js', dir);
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

  console.log('copyFileSync() - can copy a file');
  fs.copyFileSync('/cool.txt', '/cool (Copy).txt');
  strictEqual(fs.readFileSync('/cool (Copy).txt', 'utf8'), 'worlds!');

  console.log('renameSync() - can move a file');
  fs.renameSync('/cool (Copy).txt', '/dir/very-cool.txt');
  strictEqual(fs.readFileSync('/dir/very-cool.txt', 'utf8'), 'worlds!');

  console.log('rmdirSync() - can remove an empty directory');
  await fs.promises.mkdir('/to-be-deleted');
  strictEqual(fs.existsSync('/to-be-deleted'), true);
  fs.rmdirSync('/to-be-deleted');
  strictEqual(fs.existsSync('/to-be-deleted'), false);

  console.log('rmSync() - can delete a file');
  await fs.promises.writeFile('/dir/tmp', '...');
  strictEqual(fs.existsSync('/dir/tmp'), true);
  fs.rmSync('/dir/tmp');
  strictEqual(fs.existsSync('/dir/tmp'), false);

  console.log('mkdirSync() - can create a nested directory');
  fs.mkdirSync('/public/site/assets/img', { recursive: true });
  strictEqual(fs.statSync('/public/site/assets/img').isDirectory(), true);

  console.log('mkdtempSync() - can create a temporary directory');
  await fs.promises.mkdir('/tmp');
  const tmpDirName = fs.mkdtempSync('/tmp/temporary-');
  strictEqual(fs.statSync(tmpDirName).isDirectory(), true);

  console.log('truncateSync() - can truncate a file');
  await fs.promises.writeFile('/truncated.txt', 'truncate here: abcdefghijklmnopqrstuvwxyz');
  fs.truncateSync('/truncated.txt', 14);
  strictEqual(fs.readFileSync('/truncated.txt', 'utf8'), 'truncate here:');

  console.log('unlinkSync() - can delete a file');
  await fs.promises.writeFile('/delete-me.txt', 'abc');
  fs.unlinkSync('/delete-me.txt');
  strictEqual(fs.existsSync('/delete-me.txt'), false);

  console.log('readdirSync() - can list files in a directory');
  const listInDir = fs.readdirSync('/dir');
  deepEqual(listInDir, ['very-cool.txt']);

  console.log('readdirSync() - can list files in a directory as Dirent[]');
  const listInDir2 = fs.readdirSync('/dir', { withFileTypes: true }) as any;
  deepEqual(listInDir2[0].name, 'very-cool.txt');
  deepEqual(listInDir2[0].isFile(), true);

  console.log('readSync() - can read a file into a buffer');
  const buf = Buffer.alloc(3);
  const readHandle = await fs.promises.open('/cool.txt', 'r');
  const bytesRead = fs.readSync(readHandle.fd, buf, 0, 3, 0);
  strictEqual(bytesRead, 3);
  strictEqual(buf.toString('utf8'), 'wor');

  console.log('writeSync() - can write into an open file');
  const writeHandle = await fs.promises.open('/cool.txt', 'a');
  const bytesWritten = fs.writeSync(writeHandle.fd, Buffer.from('W'), 0, 1, 0);
  await writeHandle.close();
  strictEqual(bytesWritten, 1);
  strictEqual(fs.readFileSync('/cool.txt', 'utf8'), 'Worlds!');

  console.log('openSync() - can create a file');
  strictEqual(fs.existsSync('/new-file.txt'), false);
  const fd = fs.openSync('/new-file.txt', 'w');
  strictEqual(fs.existsSync('/new-file.txt'), true);
  fs.unlinkSync('/new-file.txt');
  strictEqual(typeof fd, 'number');
};

const main = async () => {
  const button = document.createElement('button');
  button.textContent = 'Select an empty folder';
  document.body.appendChild(button);
  button.onclick = async () => {
    const dir = await (window as any).showDirectoryPicker({ id: 'demo', mode: 'readwrite' });
    await demo(dir);
  };

  const button2 = document.createElement('button');
  button2.textContent = 'Run tests in OPFS';
  button2.style.marginLeft = '1em';
  document.body.appendChild(button2);
  button2.onclick = async () => {
    const dir = await navigator.storage.getDirectory();
    await demo(dir as any);
  };
};

main();
