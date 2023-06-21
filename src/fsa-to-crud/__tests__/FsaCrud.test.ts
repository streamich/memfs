import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeFileSystemDirectoryHandle } from '../../node-to-fsa';
import { FsaCrud } from '../FsaCrud';
import { testCrudfs } from '../../crud/__tests__/testCrudfs';

const setup = () => {
  const fs = memfs();
  const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
  const crud = new FsaCrud(fsa);
  return { fs, fsa, crud, snapshot: () => (<any>fs).__vol.toJSON() };
};

onlyOnNode20('FsaCrud', () => {
  testCrudfs(setup);
});
