# `print` utility

The print utility allows one to print an ASCII tree of some file system directory.
You pass in the file system object and the folder path, and it will print out the tree.

Here is the [`/src` folder print demo of this project](../../demo/print/fs.ts):

```ts
import * as fs from 'fs';
import { toTreeSync } from 'memfs/lib/print';

console.log(toTreeSync(fs, { dir: process.cwd() + '/src/fsa-to-node' }));

// Output:
// src/
// ├─ Dirent.ts
// ├─ Stats.ts
// ├─ __tests__/
// │  ├─ hasBigInt.js
// │  ├─ index.test.ts
// │  ├─ node.test.ts
// │  ├─ process.test.ts
// │  ├─ promises.test.ts
// ...
```

You can pass in any `fs` implementation, including the in-memory one from `memfs`.

```ts
import { memfs } from 'memfs';

const { fs } = memfs({
  '/Users/streamich/src/github/memfs/src': {
    'package.json': '...',
    'tsconfig.json': '...',
  },
});

console.log(toTreeSync(fs));

// /
// └─ Users/
//    └─ streamich/
//       └─ src/
//          └─ github/
//             └─ memfs/
//                └─ src/
//                   ├─ package.json
//                   ├─ tsconfig.json
```
