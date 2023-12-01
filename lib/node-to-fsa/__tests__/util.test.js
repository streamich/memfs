"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe('basename()', () => {
    test('handles empty string', () => {
        expect((0, util_1.basename)('', '/')).toBe('');
    });
    test('return the same string if there is no nesting', () => {
        expect((0, util_1.basename)('scary.exe', '/')).toBe('scary.exe');
    });
    test('ignores slash, if it is the last char', () => {
        expect((0, util_1.basename)('scary.exe/', '/')).toBe('scary.exe');
        expect((0, util_1.basename)('/ab/c/scary.exe/', '/')).toBe('scary.exe');
    });
    test('returns last step in path', () => {
        expect((0, util_1.basename)('/gg/wp/hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('gg/wp/hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('/wp/hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('wp/hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('/hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('hf/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('/gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('gl.txt', '/')).toBe('gl.txt');
    });
    test('handles double slashes', () => {
        expect((0, util_1.basename)('/gg/wp/hf//gl.txt', '/')).toBe('gl.txt');
        expect((0, util_1.basename)('//gl.txt', '/')).toBe('gl.txt');
    });
});
//# sourceMappingURL=util.test.js.map