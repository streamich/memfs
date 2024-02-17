// Run: npx ts-node demo/snapshot/index.ts

import { memfs } from '../../src';
import * as snapshot from '../../src/snapshot';

const data = {
  '/': {
    file1: '...',
    dir: {
      file2: '...',
    },
  },
};

const { fs } = memfs(data);

console.log(snapshot.toSnapshotSync({ fs }));
console.log(snapshot.toBinarySnapshotSync({ fs }));
console.log(snapshot.toJsonSnapshotSync({ fs }));
console.log(Buffer.from(snapshot.toJsonSnapshotSync({ fs })).toString());
