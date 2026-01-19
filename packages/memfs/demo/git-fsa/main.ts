(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import { FsaNodeFs } from '../../src/fsa-to-node';
import type * as fsa from '../../src/fsa/types';

import git from 'isomorphic-git';

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  try {
    const fs = ((<any>window).fs = new FsaNodeFs(dir));

    console.log('Create "/repo" folder');
    await fs.promises.mkdir('/repo');

    console.log('Init git repo');
    await git.init({ fs, dir: 'repo' });

    console.log('Create README file');
    await fs.promises.writeFile('/repo/README.md', 'Hello World\n');

    console.log('Stage README file');
    await git.add({ fs, dir: '/repo', filepath: 'README.md' });

    console.log('Commit README file');
    await git.commit({
      fs,
      dir: '/repo',
      author: { name: 'Git', email: 'leonid@kingdom.com' },
      message: 'fea: initial commit',
    });
  } catch (error) {
    console.log(error);
    console.log((<any>error).name);
  }
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
