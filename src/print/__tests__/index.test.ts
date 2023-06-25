import { toTreeSync } from '..';
import { memfs } from '../..';

test('can print a single file', () => {
  const { fs } = memfs({
    '/file.txt': '...',
  });
  expect(toTreeSync(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    └─ file.txt"
  `);
});

test('can a one level deep directory tree', () => {
  const { fs } = memfs({
    '/file.txt': '...',
    '/foo/bar.txt': '...',
    '/foo/index.php': '...',
  });
  expect(toTreeSync(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    ├─ file.txt
    └─ foo/
       ├─ bar.txt
       └─ index.php"
  `);
});

test('can print two-levels of folders', () => {
  const { fs } = memfs({
    '/level1/level2/file.txt': '...',
  });
  expect(toTreeSync(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    └─ level1/
       └─ level2/
          └─ file.txt"
  `);
});

test('can stop recursion at specified depth', () => {
  const { fs } = memfs({
    '/dir1/dir2/dir3/file.txt': '...',
  });
  expect(toTreeSync(fs, { dir: '/', depth: 2 })).toMatchInlineSnapshot(`
    "/
    └─ dir1/
       └─ dir2/ (...)"
  `);
});

test('can print symlinks', () => {
  const { fs } = memfs({
    '/a/b/c/file.txt': '...',
    '/a/b/main.rb': '...',
  });
  fs.symlinkSync('/a/b/c/file.txt', '/goto');
  expect(toTreeSync(fs)).toMatchInlineSnapshot(`
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
  const { fs } = memfs({
    '/a/b/c/file.txt': '...',
    '/a/b/main.rb': '...',
  });
  expect(toTreeSync(fs, { dir: '/a/b' })).toMatchInlineSnapshot(`
    "b/
    ├─ c/
    │  └─ file.txt
    └─ main.rb"
  `);
});
