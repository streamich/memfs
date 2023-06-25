import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeCrud } from '../NodeCrud';
import { testCrudfs } from '../../crud/__tests__/testCrudfs';

const setup = () => {
  const { fs } = memfs();
  const crud = new NodeCrud({
    fs: fs.promises,
    dir: '/',
  });
  return { fs, crud, snapshot: () => (<any>fs).__vol.toJSON() };
};

onlyOnNode20('NodeCrud', () => {
  testCrudfs(setup);
});
