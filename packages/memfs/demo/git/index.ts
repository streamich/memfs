// Run: npx ts-node demo/git/index.ts

import git from 'isomorphic-git';
import { memfs } from '../../src';

const main = async () => {
  const { fs } = memfs();

  fs.mkdirSync('/repo');
  console.log('New folder:', (<any>fs).__vol.toJSON());

  await git.init({ fs, dir: '/repo' });
  console.log('Git init:', (<any>fs).__vol.toJSON());

  fs.writeFileSync('/repo/README.md', 'Hello World\n');
  console.log('README added:', (<any>fs).__vol.toJSON());

  await git.add({ fs, dir: '/repo', filepath: 'README.md' });
  console.log('README staged:', (<any>fs).__vol.toJSON());

  await git.commit({
    fs,
    dir: '/repo',
    author: { name: 'Git', email: 'leonid@kingdom.com' },
    message: 'fea: initial commit',
  });
  console.log('README committed:', (<any>fs).__vol.toJSON());
};

main();
