import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeFileSystemDirectoryHandle } from '../../node-to-fsa';
import { FsaCrud } from '../../fsa-to-crud/FsaCrud';
import { createHash } from 'crypto';
import { hashToLocation } from '../util';
import { CrudCasBase } from '../CrudCasBase';

onlyOnNode20('CrudCas on FsaCrud', () => {
  const setup = () => {
    const { fs } = memfs();
    const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
    const crud = new FsaCrud(fsa);
    return { fs, fsa, crud, snapshot: () => (<any>fs).__vol.toJSON() };
  };
  
  test('can use a custom hashing digest type', async () => {
    const { crud } = setup();
    class Hash {
      constructor(public readonly digest: string) {}
    }
    const hash = async (blob: Uint8Array): Promise<Hash> => {
      const shasum = createHash('sha1');
      shasum.update(blob);
      const digest = shasum.digest('hex');
      return new Hash(digest);
    };
    const cas = new CrudCasBase<Hash>(crud, hash, (id: Hash) => hashToLocation(id.digest), (h1: Hash, h2: Hash) => h1.digest === h2.digest);
    const blob = Buffer.from('hello world');
    const id = await cas.put(blob);
    expect(id).toBeInstanceOf(Hash);
    const id2 = await hash(blob);
    expect(id.digest).toEqual(id2.digest);
    const blob2 = await cas.get(id);
    expect(String.fromCharCode(...blob2)).toEqual('hello world');
    expect(await cas.info(id)).toMatchObject({ size: 11 });
    await cas.del(id2);
    expect(() => cas.info(id)).rejects.toThrowError();
  });

  test('can use custom folder sharding strategy', async () => {
    const { crud } = setup();
    const hash = async (blob: Uint8Array): Promise<string> => {
      const shasum = createHash('sha1');
      shasum.update(blob);
      return shasum.digest('hex');
    };
    const cas = new CrudCasBase<string>(crud, hash, (h: string) => [[h[0], h[1], h[2]], h[3]], (h1: string, h2: string) => h1 === h2);
    const blob = Buffer.from('hello world');
    const id = await cas.put(blob);
    expect(typeof id).toBe('string');
    const id2 = await hash(blob);
    expect(id).toBe(id2);
    const blob2 = await cas.get(id);
    expect(String.fromCharCode(...blob2)).toEqual('hello world');
    const blob3 = await crud.get([id2[0], id2[1], id2[2]], id2[3]);
    expect(String.fromCharCode(...blob3)).toEqual('hello world');
  });
});
