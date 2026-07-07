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

## FileSystemObserver

`NodeFileSystemObserver` implements the [`FileSystemObserver` proposal][observer]
on top of the Node.js `fs.watch` API. It is a best-effort implementation, per
the proposal's allowance for local file systems: `rename` events are classified
into `"appeared"`/`"disappeared"` records by stat-ing the path, and no
`"moved"` records are ever produced.

```ts
import { nodeToFsa, NodeFileSystemObserver } from '@jsonjoy.com/fs-node-to-fsa';
import * as fs from 'fs';

const dir = nodeToFsa(fs, '/path/to/directory', { mode: 'readwrite' });
const observer = new NodeFileSystemObserver(fs, records => console.log(records));
await observer.observe(dir, { recursive: true });
```

## Reference

- [`nodeToFsa(fs, path, ctx)`](src/index.ts) - Converts a Node.js `fs` module to a `FileSystemDirectoryHandle`.
- [`NodeFileSystemObserver`](src/NodeFileSystemObserver.ts) - A `FileSystemObserver` implementation backed by `fs.watch`.

[node-fs]: https://nodejs.org/api/fs.html
[fsa]: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
[observer]: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver
