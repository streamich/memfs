`toTreeSync` renders an ASCII tree of a directory from any `fs`-like
filesystem. Pass the filesystem and a starting folder; get back a string.

It is published as its own package, which `memfs` already depends on:

```ts
import { toTreeSync } from '@jsonjoy.com/fs-print';
```

```ts
import * as fs from 'fs';
import { toTreeSync } from '@jsonjoy.com/fs-print';

console.log(toTreeSync(fs, { dir: process.cwd() + '/src' }));
// src/
// ├─ __tests__/
// │  ├─ index.test.ts
// │  └─ node.test.ts
// ├─ Dirent.ts
// ├─ Stats.ts
// ...
```

Any `fs` implementation works, including an in-memory `memfs` instance:

```ts
import { memfs } from 'memfs';
import { toTreeSync } from '@jsonjoy.com/fs-print';

const { fs } = memfs({
  '/src': {
    'index.ts': '...',
    util: { 'print.ts': '...' },
  },
});

console.log(toTreeSync(fs, { dir: '/src' }));
// src/
// ├─ index.ts
// └─ util/
//    └─ print.ts
```

Symlinks are rendered with an arrow to their target:

```ts
// /
// ├─ a/
// │  └─ b/
// │     └─ file.txt
// └─ goto → /a/b/file.txt
```

## Options

```ts
toTreeSync(fs: FsSynchronousApi, opts?: ToTreeOptions): string;

interface ToTreeOptions {
  dir?: string;            // starting directory, default '/'
  depth?: number;          // max recursion depth, default 10
  separator?: '/' | '\\';  // path separator, default '/'
  tab?: string;            // prefix prepended to every line, default ''
  sort?: boolean;          // sort entries (dirs first), default true
}
```

By default entries are sorted alphabetically with folders first. Set
`sort: false` to print them in raw filesystem order:

```ts
console.log(toTreeSync(fs, { sort: false }));
```

```jj.note
`toTreeSync` is synchronous only --- there is no async variant. A `Volume` also
has a built-in [`toTree()`](/libs/memfs/volumes) for the common in-memory case.
```
