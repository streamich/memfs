(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import { FsaNodeFs, FsaNodeSyncAdapterWorker } from '../../src/fsa-to-node';
import type * as fsa from '../../src/fsa/types';

const dir = navigator.storage.getDirectory() as unknown as Promise<fsa.IFileSystemDirectoryHandle>;
const fs = ((<any>window).fs = new FsaNodeFs(dir));

import git from 'isomorphic-git';

const main = async () => {
  try {
    const adapter = await FsaNodeSyncAdapterWorker.start('https://localhost:9876/worker.js', dir);
    fs.syncAdapter = adapter;

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

main();
