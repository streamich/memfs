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

const b = (str: string) => Buffer.from(str).subarray(0);

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
      expect((<DOMException>err).name).toBe('ExistsError');
    });

    test('can choose to throw if item does not exist', async () => {
      const {crud, snapshot} = setup();
      const [, err] = await of(crud.put(['a', 'b'], 'bar', b('1'), {throwIf: 'missing'}));
      await crud.put(['a', 'b'], 'bar', b('2'), );
      await crud.put(['a', 'b'], 'bar', b('3'), {throwIf: 'missing'});
      expect(err).toBeInstanceOf(DOMException);
      expect((<DOMException>err).name).toBe('MissingError');
      expect(snapshot()).toStrictEqual({
        '/a/b/bar': '3',
      });
    });
  });
});
