# @jsonjoy.com/fs-node-to-fsa

Adapter to convert [Node.js fs API][node-fs] to [File System Access API][fsa] (FSA).

## Installation

```bash
npm install @jsonjoy.com/fs-node-to-fsa
```

## Usage

```ts
import { nodeToFsa } from '@jsonjoy.com/fs-node-to-fsa';
import * as fs from 'fs';

const dir = nodeToFsa(fs, '/path/to/directory', { mode: 'readwrite' });

// Now use the FSA API
for await (const [name, handle] of dir.entries()) {
  console.log(name, handle.kind);
}
```

## Reference

- [`nodeToFsa(fs, path, ctx)`](src/index.ts) - Converts a Node.js `fs` module to a `FileSystemDirectoryHandle`.

[node-fs]: https://nodejs.org/api/fs.html
[fsa]: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
