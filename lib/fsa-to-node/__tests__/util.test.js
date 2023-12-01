"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe('pathToLocation()', () => {
    test('handles an empty string', () => {
        expect((0, util_1.pathToLocation)('')).toStrictEqual([[], '']);
    });
    test('handles a single slash', () => {
        expect((0, util_1.pathToLocation)('/')).toStrictEqual([[], '']);
    });
    test('no path, just filename', () => {
        expect((0, util_1.pathToLocation)('scary.exe')).toStrictEqual([[], 'scary.exe']);
    });
    test('strips trailing slash', () => {
        expect((0, util_1.pathToLocation)('scary.exe/')).toStrictEqual([[], 'scary.exe']);
    });
    test('multiple steps in the path', () => {
        expect((0, util_1.pathToLocation)('/gg/wp/hf/gl.txt')).toStrictEqual([['gg', 'wp', 'hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('gg/wp/hf/gl.txt')).toStrictEqual([['gg', 'wp', 'hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('/wp/hf/gl.txt')).toStrictEqual([['wp', 'hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('wp/hf/gl.txt')).toStrictEqual([['wp', 'hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('/hf/gl.txt')).toStrictEqual([['hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('hf/gl.txt')).toStrictEqual([['hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('/gl.txt')).toStrictEqual([[], 'gl.txt']);
        expect((0, util_1.pathToLocation)('gl.txt')).toStrictEqual([[], 'gl.txt']);
    });
    test('handles double slashes', () => {
        expect((0, util_1.pathToLocation)('/gg/wp//hf/gl.txt')).toStrictEqual([['gg', 'wp', '', 'hf'], 'gl.txt']);
        expect((0, util_1.pathToLocation)('//gl.txt')).toStrictEqual([[''], 'gl.txt']);
    });
});
//# sourceMappingURL=util.test.js.map