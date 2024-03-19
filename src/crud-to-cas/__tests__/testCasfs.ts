import { of } from '../../thingies';
import { createHash } from 'crypto';
import { hashToLocation } from '../util';
import type { CasApi } from '../../cas/types';
import type { CrudApi } from '../../crud/types';

export const hash = async (blob: Uint8Array): Promise<string> => {
  const shasum = createHash('sha1');
  shasum.update(blob);
  return shasum.digest('hex');
};

const b = (str: string) => {
  const buf = Buffer.from(str);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

export type Setup = () => {
  cas: CasApi<string>;
  crud: CrudApi;
  snapshot: () => Record<string, string | null>;
};

export const testCasfs = (setup: Setup) => {
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

    test('throws if blob contents does not match the hash', async () => {
      const blob = b('hello world');
      const { cas, crud } = setup();
      const hash = await cas.put(blob);
      const location = hashToLocation(hash);
      await crud.put(location[0], location[1], b('hello world!'));
      const [, err] = await of(cas.get(hash));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('Integrity');
    });

    test('does not throw if integrity check is skipped', async () => {
      const blob = b('hello world');
      const { cas, crud } = setup();
      const hash = await cas.put(blob);
      const location = hashToLocation(hash);
      await crud.put(location[0], location[1], b('hello world!'));
      const blob2 = await cas.get(hash, { skipVerification: true });
      expect(blob2).toStrictEqual(b('hello world!'));
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
};
