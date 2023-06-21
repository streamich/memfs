import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeFileSystemDirectoryHandle } from '../../node-to-fsa';
import { FsaNodeFs } from '../../fsa-to-node';
import { NodeCrud } from '../../node-to-crud';
import { testCrudfs } from '../../crud/__tests__/testCrudfs';
import { FsaCrud } from '../../fsa-to-crud';

onlyOnNode20('CRUD matryoshka', () => {
  describe('crud(memfs)', () => {
    testCrudfs(() => {
      const fs = memfs();
      const crud = new NodeCrud({ fs: fs.promises, dir: '/' });
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fsa(memfs))', () => {
    testCrudfs(() => {
      const fs = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const crud = new FsaCrud(fsa);
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fs(fsa(memfs)))', () => {
    testCrudfs(() => {
      const fs = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const crud = new NodeCrud({ fs: fs2.promises, dir: '/' });
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fsa(fs(fsa(memfs))))', () => {
    testCrudfs(() => {
      const fs = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const fsa2 = new NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
      const crud = new FsaCrud(fsa2);
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fs(fsa(fs(fsa(memfs)))))', () => {
    testCrudfs(() => {
      const fs = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const fsa2 = new NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
      const fs3 = new FsaNodeFs(fsa2);
      const crud = new NodeCrud({ fs: fs3.promises, dir: '/' });
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fsa(fs(fsa(fs(fsa(memfs))))))', () => {
    testCrudfs(() => {
      const fs = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const fsa2 = new NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
      const fs3 = new FsaNodeFs(fsa2);
      const fsa3 = new NodeFileSystemDirectoryHandle(fs3, '/', { mode: 'readwrite' });
      const crud = new FsaCrud(fsa3);
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });
});
