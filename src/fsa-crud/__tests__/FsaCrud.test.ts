import {of} from 'thingies';
import {memfs} from '../..';
import {onlyOnNode20} from '../../__tests__/util';
import {NodeFileSystemDirectoryHandle} from '../../node-to-fsa';
import {FsaCrud} from '../FsaCrud';

const setup = () => {
  const fs = memfs();
  const fsa = new NodeFileSystemDirectoryHandle(fs, '/', {mode: 'readwrite'});
  const crud = new FsaCrud(fsa);
  return {fs, fsa, crud, snapshot: () => (<any>fs).__vol.toJSON()};
};

const b = (str: string) => {
  const buf = Buffer.from(str);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

onlyOnNode20('FsaCrud', () => {
  describe('.put()', () => {
    test('throws if the type is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.put(['', 'foo'], 'bar', new Uint8Array()));
      expect(err).toBeInstanceOf(TypeError);
    });

    test('throws if id is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.put(['foo'], '', new Uint8Array()));
      expect(err).toBeInstanceOf(TypeError);
    });

    test('can store a resource at root', async () => {
      const {crud, snapshot} = setup();
      await crud.put([], 'bar', b('abc'));
      expect(snapshot()).toStrictEqual({
        '/bar': 'abc',
      });
    });

    test('can store a resource in two levels deep collection', async () => {
      const {crud, snapshot} = setup();
      await crud.put(['a', 'b'], 'bar', b('abc'));
      expect(snapshot()).toStrictEqual({
        '/a/b/bar': 'abc',
      });
    });

    test('can overwrite existing resource', async () => {
      const {crud, snapshot} = setup();
      await crud.put(['a', 'b'], 'bar', b('abc'));
      await crud.put(['a', 'b'], 'bar', b('efg'));
      expect(snapshot()).toStrictEqual({
        '/a/b/bar': 'efg',
      });
    });

    test('can choose to throw if item already exists', async () => {
      const {crud} = setup();
      await crud.put(['a', 'b'], 'bar', b('abc'), {throwIf: 'exists'});
      const [, err] = await of(crud.put(['a', 'b'], 'bar', b('efg'), {throwIf: 'exists'}));
      expect(err).toBeInstanceOf(DOMException);
      expect((<DOMException>err).name).toBe('Exists');
    });

    test('can choose to throw if item does not exist', async () => {
      const {crud, snapshot} = setup();
      const [, err] = await of(crud.put(['a', 'b'], 'bar', b('1'), {throwIf: 'missing'}));
      await crud.put(['a', 'b'], 'bar', b('2'), );
      await crud.put(['a', 'b'], 'bar', b('3'), {throwIf: 'missing'});
      expect(err).toBeInstanceOf(DOMException);
      expect((<DOMException>err).name).toBe('Missing');
      expect(snapshot()).toStrictEqual({
        '/a/b/bar': '3',
      });
    });
  });

  describe('.get()', () => {
    test('throws if the type is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.get(['', 'foo'], 'bar'));
      expect(err).toBeInstanceOf(TypeError);
    });

    test('throws if id is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.get(['foo'], ''));
      expect(err).toBeInstanceOf(TypeError);
    });

    test('throws if collection does not exist', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.get(['foo'], 'bar'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('CollectionNotFound');
    });

    test('throws if resource does not exist', async () => {
      const {crud} = setup();
      await crud.put(['foo'], 'bar', b('abc'));
      const [, err] = await of(crud.get(['foo'], 'baz'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('ResourceNotFound');
    });

    test('can fetch an existing resource', async () => {
      const {crud} = setup();
      await crud.put(['foo'], 'bar', b('abc'));
      const blob = await crud.get(['foo'], 'bar');
      expect(blob).toStrictEqual(b('abc'));
    });
  });

  describe('.del()', () => {
    test('throws if the type is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.del(['', 'foo'], 'bar'));
      expect(err).toBeInstanceOf(TypeError);
    });

    test('throws if id is not valid', async () => {
      const {crud} = setup();
      const [, err] = await of(crud.del(['foo'], ''));
      expect(err).toBeInstanceOf(TypeError);
    });


    describe('when collection does not exist', () => {
      test('throws by default', async () => {
        const {crud} = setup();
        const [, err] = await of(crud.del(['foo'], 'bar'));
        expect(err).toBeInstanceOf(DOMException);
        expect((<any>err).name).toBe('CollectionNotFound');
      });

      test('does not throw when "silent" flag set', async () => {
        const {crud} = setup();
        await crud.del(['foo'], 'bar', true);
      });
    });

    describe('when collection is found but resource is not', () => {
      test('throws by default', async () => {
        const {crud} = setup();
        await crud.put(['foo'], 'bar', b('abc'));
        const [, err] = await of(crud.del(['foo'], 'baz'));
        expect(err).toBeInstanceOf(DOMException);
        expect((<any>err).name).toBe('ResourceNotFound');
      });

      test('does not throw when "silent" flag set', async () => {
        const {crud} = setup();
        await crud.put(['foo'], 'bar', b('abc'));
        await crud.del(['foo'], 'baz', true);
      });
    });

    test('deletes an existing resource', async () => {
      const {crud} = setup();
      await crud.put(['foo'], 'bar', b('abc'));
      await crud.get(['foo'], 'bar');
      await crud.del(['foo'], 'bar');
      const [, err] = await of(crud.get(['foo'], 'bar'));
      expect(err).toBeInstanceOf(DOMException);
      expect((<any>err).name).toBe('ResourceNotFound');
    });
  });
});
