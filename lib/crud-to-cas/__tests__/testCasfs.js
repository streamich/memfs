"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCasfs = exports.hash = void 0;
const thingies_1 = require("thingies");
const crypto_1 = require("crypto");
const util_1 = require("../util");
const hash = async (blob) => {
    const shasum = (0, crypto_1.createHash)('sha1');
    shasum.update(blob);
    return shasum.digest('hex');
};
exports.hash = hash;
const b = (str) => {
    const buf = Buffer.from(str);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};
const testCasfs = (setup) => {
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
            const [, err] = await (0, thingies_1.of)(cas.get('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('BlobNotFound');
        });
        test('throws if blob contents does not match the hash', async () => {
            const blob = b('hello world');
            const { cas, crud } = setup();
            const hash = await cas.put(blob);
            const location = (0, util_1.hashToLocation)(hash);
            await crud.put(location[0], location[1], b('hello world!'));
            const [, err] = await (0, thingies_1.of)(cas.get(hash));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('Integrity');
        });
        test('does not throw if integrity check is skipped', async () => {
            const blob = b('hello world');
            const { cas, crud } = setup();
            const hash = await cas.put(blob);
            const location = (0, util_1.hashToLocation)(hash);
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
            const [, err] = await (0, thingies_1.of)(cas.info('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('BlobNotFound');
        });
    });
    describe('.del()', () => {
        test('can delete an existing blob', async () => {
            const blob = b('hello world');
            const { cas } = setup();
            const hash = await cas.put(blob);
            const info = await cas.info(hash);
            await cas.del(hash);
            const [, err] = await (0, thingies_1.of)(cas.info(hash));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('BlobNotFound');
        });
        test('throws if blob does not exist', async () => {
            const blob = b('hello world 2');
            const { cas } = setup();
            const hash = await cas.put(blob);
            const [, err] = await (0, thingies_1.of)(cas.del('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'));
            expect(err).toBeInstanceOf(DOMException);
            expect(err.name).toBe('BlobNotFound');
        });
        test('does not throw if "silent" flag is provided', async () => {
            const blob = b('hello world 2');
            const { cas } = setup();
            const hash = await cas.put(blob);
            await cas.del('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed', true);
        });
    });
};
exports.testCasfs = testCasfs;
//# sourceMappingURL=testCasfs.js.map