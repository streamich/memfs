import { of } from 'thingies';
import { createHash } from 'crypto';
import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';
import { NodeFileSystemDirectoryHandle } from '../../node-to-fsa';
import { FsaCrud } from '../../fsa-to-crud/FsaCrud';
import { CrudCas } from '../CrudCas';

const hash = async (blob: Uint8Array): Promise<string> => {
  const shasum = createHash('sha1');
  shasum.update(blob);
  return shasum.digest('hex');
};

const setup = () => {
  const fs = memfs();
  const fsa = new NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
  const crud = new FsaCrud(fsa);
  const cas = new CrudCas(crud, { hash });
  return { fs, fsa, crud, cas, snapshot: () => (<any>fs).__vol.toJSON() };
};

const b = (str: string) => {
  const buf = Buffer.from(str);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

onlyOnNode20('CrudCas', () => {
  describe('.put()', () => {
    test('can store a blob', async () => {
      const blob = b('hello world');
      const { cas, snapshot } = setup();
      const hash = await cas.put(blob);
      expect(hash).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
      expect(snapshot()).toMatchSnapshot();
    });
  });

  describe('.get()', () => {
    test('can retrieve existing blob', async () => {
      const blob = b('hello world');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const blob2 = await cas.get(hash);
      expect(blob2).toStrictEqual(blob);
    });

    test('throws if blob does not exist', async () => {
      const blob = b('hello world 2');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const [, err] = await of(cas.get('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('BlobNotFound');
    });
  });

  describe('.info()', () => {
    test('can retrieve existing blob info', async () => {
      const blob = b('hello world');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const info = await cas.info(hash);
      expect(info.size).toBe(11);
    });

    test('throws if blob does not exist', async () => {
      const blob = b('hello world 2');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const [, err] = await of(cas.info('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('BlobNotFound');
    });
  });

  describe('.del()', () => {
    test('can delete an existing blob', async () => {
      const blob = b('hello world');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const info = await cas.info(hash);
      await cas.del(hash);
      const [, err] = await of(cas.info(hash));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('BlobNotFound');
    });

    test('throws if blob does not exist', async () => {
      const blob = b('hello world 2');
      const { cas } = setup();
      const hash = await cas.put(blob);
      const [, err] = await of(cas.del('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('BlobNotFound');
    });

    test('does not throw if "silent" flag is provided', async () => {
      const blob = b('hello world 2');
      const { cas } = setup();
      const hash = await cas.put(blob);
      await cas.del('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed', true);
    });
  });
});
