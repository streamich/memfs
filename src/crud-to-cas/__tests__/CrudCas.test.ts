import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeFileSystemDirectoryHandle } from '../../node-to-fsa';
import { FsaCrud } from '../../fsa-to-crud/FsaCrud';
import { CrudCas } from '../CrudCas';
import { testCasfs, hash } from './testCasfs';
import { NodeCrud } from '../../node-to-crud/NodeCrud';

onlyOnNode20('CrudCas on FsaCrud', () => {
  const setup = () => {
    const fs = memfs();
    const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
    const crud = new FsaCrud(fsa);
    const cas = new CrudCas(crud, { hash });
    return { fs, fsa, crud, cas, snapshot: () => (<any>fs).__vol.toJSON() };
  };
  testCasfs(setup);
});

onlyOnNode20('CrudCas on NodeCrud at root', () => {
  const setup = () => {
    const fs = memfs();
    const crud = new NodeCrud({fs: fs.promises, dir: '/'});
    const cas = new CrudCas(crud, { hash });
    return { fs, crud, cas, snapshot: () => (<any>fs).__vol.toJSON() };
  };
  testCasfs(setup);
});

onlyOnNode20('CrudCas on NodeCrud at in sub-folder', () => {
  const setup = () => {
    const fs = memfs({'/a/b/c': null});
    const crud = new NodeCrud({fs: fs.promises, dir: '/a/b/c'});
    const cas = new CrudCas(crud, { hash });
    return { fs, crud, cas, snapshot: () => (<any>fs).__vol.toJSON() };
  };
  testCasfs(setup);
});
