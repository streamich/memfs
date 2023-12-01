"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const __2 = require("../..");
test('can print a single file', () => {
    const { fs } = (0, __2.memfs)({
        '/file.txt': '...',
    });
    expect((0, __1.toTreeSync)(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    └─ file.txt"
  `);
});
test('can a one level deep directory tree', () => {
    const { fs } = (0, __2.memfs)({
        '/file.txt': '...',
        '/foo/bar.txt': '...',
        '/foo/index.php': '...',
    });
    expect((0, __1.toTreeSync)(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    ├─ file.txt
    └─ foo/
       ├─ bar.txt
       └─ index.php"
  `);
});
test('can print two-levels of folders', () => {
    const { fs } = (0, __2.memfs)({
        '/level1/level2/file.txt': '...',
    });
    expect((0, __1.toTreeSync)(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    └─ level1/
       └─ level2/
          └─ file.txt"
  `);
});
test('can stop recursion at specified depth', () => {
    const { fs } = (0, __2.memfs)({
        '/dir1/dir2/dir3/file.txt': '...',
    });
    expect((0, __1.toTreeSync)(fs, { dir: '/', depth: 2 })).toMatchInlineSnapshot(`
    "/
    └─ dir1/
       └─ dir2/ (...)"
  `);
});
test('can print symlinks', () => {
    const { fs } = (0, __2.memfs)({
        '/a/b/c/file.txt': '...',
        '/a/b/main.rb': '...',
    });
    fs.symlinkSync('/a/b/c/file.txt', '/goto');
    expect((0, __1.toTreeSync)(fs)).toMatchInlineSnapshot(`
    "/
    ├─ a/
    │  └─ b/
    │     ├─ c/
    │     │  └─ file.txt
    │     └─ main.rb
    └─ goto → /a/b/c/file.txt"
  `);
});
test('can print starting from subfolder', () => {
    const { fs } = (0, __2.memfs)({
        '/a/b/c/file.txt': '...',
        '/a/b/main.rb': '...',
    });
    expect((0, __1.toTreeSync)(fs, { dir: '/a/b' })).toMatchInlineSnapshot(`
    "b/
    ├─ c/
    │  └─ file.txt
    └─ main.rb"
  `);
});
//# sourceMappingURL=index.test.js.map