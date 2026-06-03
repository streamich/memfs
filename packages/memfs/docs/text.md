`memfs` is an in-memory file system. It implements two APIs:

- **Node's [`fs` module](https://nodejs.org/api/fs.html)** --- a drop-in
  replacement you can use anywhere the `fs` module is expected (tests, mocks,
  bundlers, sandboxes). Files live in memory instead of on disk.
- **The browser [File System Access (FSA) API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)** --- the same `FileSystemDirectoryHandle` interface a browser exposes, backed by memory.

It also ships adapters that translate _between_ those two APIs, so you can run `fs`-based
code in the browser on top of a real directory, or expose an `fs`-like filesystem through
FSA handles. It runs in Node.js, Deno, Bun, and browsers, and stores file contents
in `Uint8Array` buffers.

```ts
import { fs } from 'memfs';

fs.writeFileSync('/hello.txt', 'Hello, World!');
fs.readFileSync('/hello.txt', 'utf8'); // 'Hello, World!'

fs.mkdirSync('/dir');
fs.readdirSync('/'); // ['dir', 'hello.txt']
```

## Install

```
npm install memfs
```

## Two ways in

The default export gives you a ready-to-use filesystem. `fs` is a bound, `require('fs')`-shaped
object --- `vol` is the `Volume` behind it. They share the same storage.

```ts
import { fs, vol } from 'memfs';

fs.writeFileSync('/script.sh', 'sudo rm -rf *');
vol.toJSON(); // {'/script.sh': 'sudo rm -rf *'}
```

For an isolated filesystem (recommended for tests, so volumes never bleed into
each other), call `memfs()` --- it returns a fresh `fs`/`vol` pair, optionally
seeded from a JSON tree:

```ts
import { memfs } from 'memfs';

const { fs, vol } = memfs({ '/app/index.js': 'console.log(1)' });

fs.readFileSync('/app/index.js', 'utf8'); // 'console.log(1)'
```

## Surface map

| Page                                                 | Import                                           | What it covers                                                                      |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [Node fs API](/libs/memfs/node-fs-api)               | `memfs`                                          | The `fs`/`vol`/`Volume`/`memfs()` model and the full Node `fs` method surface       |
| [Volumes](/libs/memfs/volumes)                       | `memfs`                                          | Building volumes from JSON, exporting them, and `unionfs` / `fs-monkey` integration |
| [File System Access](/libs/memfs/file-system-access) | `memfs/lib/fsa`                                  | An in-memory FSA filesystem (`FileSystemDirectoryHandle` and friends)               |
| [Adapters](/libs/memfs/adapters)                     | `memfs/lib/node-to-fsa`, `memfs/lib/fsa-to-node` | Convert between the `fs` API and the FSA API in either direction                    |
| [Snapshots](/libs/memfs/snapshots)                   | `@jsonjoy.com/fs-snapshot`                       | POJO / CBOR / JSON snapshots of any `fs` directory                                  |
| [Tree printing](/libs/memfs/tree-printing)           | `@jsonjoy.com/fs-print`                          | Print an ASCII tree of any `fs` directory                                           |

```jj.note
`memfs` is built from a set of smaller `@jsonjoy.com/fs-*` packages
(`fs-node`, `fs-fsa`, `fs-node-to-fsa`, `fs-fsa-to-node`, `fs-snapshot`,
`fs-print`, ...). Installing `memfs` pulls them all in; the snapshot and
tree-printing utilities are also publishable on their own.
```
