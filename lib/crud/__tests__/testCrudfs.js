"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCrudfs = void 0;
const thingies_1 = require("thingies");
const b = (str) => {
    const buf = Buffer.from(str);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};
const testCrudfs = (setup) => {
    describe('.put()', () => {
        test('throws if the type is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.put(['.', 'foo'], 'bar', new Uint8Array()));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'put' on 'crudfs': Name is not allowed.");
        });
        test('throws if id is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.put(['foo'], '..', new Uint8Array()));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'put' on 'crudfs': Name is not allowed.");
        });
        test('can store a resource at root', async () => {
            const { crud, snapshot } = setup();
            await crud.put([], 'bar', b('abc'));
            expect(snapshot()).toStrictEqual({
                '/bar': 'abc',
            });
        });
        test('can store a resource in two levels deep collection', async () => {
            const { crud, snapshot } = setup();
            await crud.put(['a', 'b'], 'bar', b('abc'));
            expect(snapshot()).toStrictEqual({
                '/a/b/bar': 'abc',
            });
        });
        test('can overwrite existing resource', async () => {
            const { crud, snapshot } = setup();
            await crud.put(['a', 'b'], 'bar', b('abc'));
            await crud.put(['a', 'b'], 'bar', b('efg'));
            expect(snapshot()).toStrictEqual({
                '/a/b/bar': 'efg',
            });
        });
        test('can choose to throw if item already exists', async () => {
            const { crud } = setup();
            await crud.put(['a', 'b'], 'bar', b('abc'), { throwIf: 'exists' });
            const [, err] = await (0, thingies_1.of)(crud.put(['a', 'b'], 'bar', b('efg'), { throwIf: 'exists' }));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('Exists');
        });
        test('can choose to throw if item does not exist', async () => {
            const { crud, snapshot } = setup();
            const [, err] = await (0, thingies_1.of)(crud.put(['a', 'b'], 'bar', b('1'), { throwIf: 'missing' }));
            await crud.put(['a', 'b'], 'bar', b('2'));
            await crud.put(['a', 'b'], 'bar', b('3'), { throwIf: 'missing' });
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('Missing');
            expect(snapshot()).toStrictEqual({
                '/a/b/bar': '3',
            });
        });
    });
    describe('.get()', () => {
        test('throws if the type is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.get(['', 'foo'], 'bar'));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'get' on 'crudfs': Name is not allowed.");
        });
        test('throws if id is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.get(['foo'], ''));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'get' on 'crudfs': Name is not allowed.");
        });
        test('throws if collection does not exist', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.get(['foo'], 'bar'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('CollectionNotFound');
        });
        test('throws if resource does not exist', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            const [, err] = await (0, thingies_1.of)(crud.get(['foo'], 'baz'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('ResourceNotFound');
        });
        test('can fetch an existing resource', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            const blob = await crud.get(['foo'], 'bar');
            expect(blob).toStrictEqual(b('abc'));
        });
    });
    describe('.del()', () => {
        test('throws if the type is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.del(['sdf\\dd', 'foo'], 'bar'));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'del' on 'crudfs': Name is not allowed.");
        });
        test('throws if id is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.del(['foo'], 'asdf/asdf'));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'del' on 'crudfs': Name is not allowed.");
        });
        describe('when collection does not exist', () => {
            test('throws by default', async () => {
                const { crud } = setup();
                const [, err] = await (0, thingies_1.of)(crud.del(['foo'], 'bar'));
                expect(err).toBeInstanceOf(DOMException);
                expect(err.name).toBe('CollectionNotFound');
            });
            test('does not throw when "silent" flag set', async () => {
                const { crud } = setup();
                await crud.del(['foo'], 'bar', true);
            });
        });
        describe('when collection is found but resource is not', () => {
            test('throws by default', async () => {
                const { crud } = setup();
                await crud.put(['foo'], 'bar', b('abc'));
                const [, err] = await (0, thingies_1.of)(crud.del(['foo'], 'baz'));
                expect(err).toBeInstanceOf(DOMException);
                expect(err.name).toBe('ResourceNotFound');
            });
            test('does not throw when "silent" flag set', async () => {
                const { crud } = setup();
                await crud.put(['foo'], 'bar', b('abc'));
                await crud.del(['foo'], 'baz', true);
            });
        });
        test('deletes an existing resource', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            await crud.get(['foo'], 'bar');
            await crud.del(['foo'], 'bar');
            const [, err] = await (0, thingies_1.of)(crud.get(['foo'], 'bar'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('ResourceNotFound');
        });
    });
    describe('.info()', () => {
        test('throws if the type is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.info(['', 'foo'], 'bar'));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'info' on 'crudfs': Name is not allowed.");
        });
        test('throws if id is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.info(['foo'], '/'));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'info' on 'crudfs': Name is not allowed.");
        });
        test('can retrieve information about a resource', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            const info = await crud.info(['foo'], 'bar');
            expect(info).toMatchObject({
                type: 'resource',
                id: 'bar',
                size: 3,
                modified: expect.any(Number),
            });
        });
        test('can retrieve information about a collection', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            const info = await crud.info(['foo']);
            expect(info).toMatchObject({
                type: 'collection',
            });
        });
        test('throws when resource not found', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('abc'));
            const [, err] = await (0, thingies_1.of)(crud.info(['foo'], 'baz'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('ResourceNotFound');
        });
        test('throws when collection not found', async () => {
            const { crud } = setup();
            await crud.put(['foo', 'a'], 'bar', b('abc'));
            const [, err] = await (0, thingies_1.of)(crud.info(['foo', 'b'], 'baz'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('CollectionNotFound');
        });
    });
    describe('.drop()', () => {
        test('throws if the collection is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.drop(['', 'foo']));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'drop' on 'crudfs': Name is not allowed.");
        });
        test('can recursively delete a collection', async () => {
            const { crud } = setup();
            await crud.put(['foo', 'a'], 'bar', b('1'));
            await crud.put(['foo', 'a'], 'baz', b('2'));
            await crud.put(['foo', 'b'], 'xyz', b('3'));
            const info = await crud.info(['foo', 'a']);
            expect(info.type).toBe('collection');
            await crud.drop(['foo', 'a']);
            const [, err] = await (0, thingies_1.of)(crud.info(['foo', 'a']));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('CollectionNotFound');
        });
        test('throws if collection does not exist', async () => {
            const { crud } = setup();
            await crud.put(['foo', 'a'], 'bar', b('1'));
            await crud.put(['foo', 'a'], 'baz', b('2'));
            await crud.put(['foo', 'b'], 'xyz', b('3'));
            const [, err] = await (0, thingies_1.of)(crud.drop(['gg']));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('CollectionNotFound');
        });
        test('when "silent" flag set, does not throw if collection does not exist', async () => {
            const { crud } = setup();
            await crud.put(['foo', 'a'], 'bar', b('1'));
            await crud.put(['foo', 'a'], 'baz', b('2'));
            await crud.put(['foo', 'b'], 'xyz', b('3'));
            await crud.drop(['gg'], true);
        });
        test('can recursively delete everything from root', async () => {
            const { crud, snapshot } = setup();
            await crud.put(['foo', 'a'], 'bar', b('1'));
            await crud.put(['baz', 'a'], 'baz', b('2'));
            await crud.put(['bar', 'b'], 'xyz', b('3'));
            const info = await crud.info(['foo', 'a']);
            expect(info.type).toBe('collection');
            await crud.drop([]);
            expect(snapshot()).toEqual({});
        });
    });
    describe('.list()', () => {
        test('throws if the collection is not valid', async () => {
            const { crud } = setup();
            const [, err] = await (0, thingies_1.of)(crud.list(['./..', 'foo']));
            expect(err).toBeInstanceOf(TypeError);
            expect(err.message).toBe("Failed to execute 'drop' on 'crudfs': Name is not allowed.");
        });
        test('can retrieve a list of resources and collections at root', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('1'));
            await crud.put([], 'baz', b('1'));
            await crud.put([], 'qux', b('2'));
            const list = await crud.list([]);
            expect(list.length).toBe(3);
            expect(list.find(x => x.id === 'baz')).toMatchObject({
                type: 'resource',
                id: 'baz',
            });
            expect(list.find(x => x.id === 'qux')).toMatchObject({
                type: 'resource',
                id: 'qux',
            });
            expect(list.find(x => x.id === 'foo')).toMatchObject({
                type: 'collection',
                id: 'foo',
            });
        });
        test('throws when try to list a non-existing collection', async () => {
            const { crud } = setup();
            await crud.put(['foo'], 'bar', b('1'));
            await crud.put([], 'baz', b('1'));
            await crud.put([], 'qux', b('2'));
            const [, err] = await (0, thingies_1.of)(crud.list(['gg']));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('CollectionNotFound');
        });
    });
};
exports.testCrudfs = testCrudfs;
//# sourceMappingURL=testCrudfs.js.map