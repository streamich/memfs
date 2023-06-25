// Run: npx ts-node demo/volume/print-tree.ts

import { memfs } from '../../src';

const { vol } = memfs({
  '/Users/streamich/src/github/memfs/src': {
    'package.json': '...',
    'tsconfig.json': '...',
    'index.ts': '...',
    'util': {
      'index.ts': '...',
      'print': {
        'index.ts': '...',
        'printTree.ts': '...',
      },
    },
  },
});

console.log(vol.toTree());

// Output:
// /
// └─ Users/
//    └─ streamich/
//       └─ src/
//          └─ github/
//             └─ memfs/
//                └─ src/
//                   ├─ index.ts
//                   ├─ package.json
//                   ├─ tsconfig.json
//                   └─ util/
//                      ├─ index.ts
//                      └─ print/
//                         ├─ index.ts
//                         └─ printTree.ts
