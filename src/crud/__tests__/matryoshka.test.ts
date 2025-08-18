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
      const { fs } = memfs();
      const crud = new NodeCrud({ fs: fs.promises, dir: '/' });
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fsa(memfs))', () => {
    testCrudfs(() => {
      const { fs } = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const crud = new FsaCrud(fsa);
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fs(fsa(memfs)))', () => {
    test('can write at offset', async () => {
      const { fs } = memfs();
      await fs.promises.writeFile('/file1.txt', 'abc');
      const handle1 = await fs.promises.open('/file1.txt', 'r+');
      await handle1.write(Buffer.from('.'), 0, 1, 1);
      expect(await fs.promises.readFile('/file1.txt', 'utf8')).toBe('a.c');

      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const file2 = await fsa.getFileHandle('file2.txt', { create: true });
      const writable1 = await file2.createWritable({ keepExistingData: false });
      await writable1.write('abc');
      await writable1.close();
      const writable2 = await file2.createWritable({ keepExistingData: true });
      await writable2.write({
        type: 'write',
        data: Buffer.from('.'),
        position: 1,
        size: 1,
      });
      await writable2.close();
      expect(await (await file2.getFile()).text()).toBe('a.c');

      const fs2 = new FsaNodeFs(fsa);
      await fs2.promises.writeFile('/file3.txt', 'abc');
      const handle = await fs2.promises.open('/file3.txt', 'r+');
      await handle.write(Buffer.from('.'), 0, 1, 1);
      expect(await fs2.promises.readFile('/file3.txt', 'utf8')).toBe('a.c');
    });

    testCrudfs(() => {
      const { fs } = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const crud = new NodeCrud({ fs: fs2.promises, dir: '/' });
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fsa(fs(fsa(memfs))))', () => {
    testCrudfs(() => {
      const { fs } = memfs();
      const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
      const fs2 = new FsaNodeFs(fsa);
      const fsa2 = new NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
      const crud = new FsaCrud(fsa2);
      return { crud, snapshot: () => (<any>fs).__vol.toJSON() };
    });
  });

  describe('crud(fs(fsa(fs(fsa(memfs)))))', () => {
    testCrudfs(() => {
      const { fs } = memfs();
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
      const { fs } = memfs();
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
