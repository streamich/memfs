import { toTreeSync } from '..';
import { createTestFs } from './testUtils';

test('can print a single file', () => {
  const fs = createTestFs({
    '/file.txt': '...',
  });
  expect(toTreeSync(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    └─ file.txt"
  `);
});

test('can a one level deep directory tree', () => {
  const fs = createTestFs({
    '/file.txt': '...',
    '/foo/bar.txt': '...',
    '/foo/index.php': '...',
  });
  expect(toTreeSync(fs, { dir: '/' })).toMatchInlineSnapshot(`
    "/
    ├─ foo/
    │  ├─ bar.txt
    │  └─ index.php
    └─ file.txt"
  `);
});

test('can print two-levels of folders', () => {
  const fs = createTestFs({
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
  const fs = createTestFs({
    '/dir1/dir2/dir3/file.txt': '...',
  });
  expect(toTreeSync(fs, { dir: '/', depth: 2 })).toMatchInlineSnapshot(`
    "/
    └─ dir1/
       └─ dir2/ (...)"
  `);
});

test('can print symlinks', () => {
  const fs = createTestFs({
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
  const fs = createTestFs({
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

test('can print folders sorted first', () => {
  const fs = createTestFs({
    '/a.txt': '...',
    '/b/file.txt': '...',
    '/c.txt': '...',
  });
  expect(toTreeSync(fs)).toMatchInlineSnapshot(`
    "/
    ├─ b/
    │  └─ file.txt
    ├─ a.txt
    └─ c.txt"
  `);
});

test('can print files and folders sorted alphabetically', () => {
  const fs = createTestFs({
    '/a.txt': '...',
    '/c.txt': '...',
    '/b.txt': '...',
    '/src/a.txt': '...',
    '/src/c.txt': '...',
    '/src/b.txt': '...',
  });
  expect(toTreeSync(fs)).toMatchInlineSnapshot(`
    "/
    ├─ src/
    │  ├─ a.txt
    │  ├─ b.txt
    │  └─ c.txt
    ├─ a.txt
    ├─ b.txt
    └─ c.txt"
  `);
});
