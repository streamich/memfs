`memfs` bridges its two APIs in both directions:

- **Node `fs`-to-FSA** (`memfs/lib/node-to-fsa`) --- expose any `fs`-like
  filesystem (the real `fs`, a `memfs` volume, anything) through browser FSA
  handles.
- **FSA-to-Node `fs`** (`memfs/lib/fsa-to-node`) --- run `fs`-based code on
  top of a real FSA directory (e.g. the browser's OPFS or a user-picked folder).

## Node `fs`-to-FSA

`nodeToFsa` wraps a folder of an `fs`-like filesystem into a `FileSystemDirectoryHandle`:

```ts
import {nodeToFsa} from 'memfs/lib/node-to-fsa';

nodeToFsa(fs, dirPath: string, ctx?: {
  mode?: 'read' | 'readwrite';   // default 'read'
  syncHandleAllowed?: boolean;
  separator?: '/' | '\\';
}): FileSystemDirectoryHandle;
```

The `fs` argument can be Node's real `fs` module or any `fs`-like object,
including a `memfs` instance:

```ts
import { memfs } from 'memfs';
import { nodeToFsa } from 'memfs/lib/node-to-fsa';

const { fs } = memfs({ '/files/note.txt': 'hi' });
const dir = nodeToFsa(fs, '/files', { mode: 'readwrite' });

const handle = await dir.getFileHandle('note.txt');
await (await handle.getFile()).text(); // 'hi'

const created = await dir.getFileHandle('new.txt', { create: true });
const writable = await created.createWritable();
await writable.write('data');
await writable.close();
```

From here you have a real FSA
handle: `getDirectoryHandle`, `removeEntry`, `entries()`, `createWritable()`,
and (when `syncHandleAllowed`) `createSyncAccessHandle()` all work --- see
[File System Access](/libs/memfs/file-system-access) for the handle surface.

```jj.note
The writable stream writes to a temporary `.crswap` swap file and atomically
renames it over the target on `close()`, mirroring how Chrome implements FSA
writes.
```

## FSA-to-Node `fs`

`FsaNodeFs` implements the Node `fs` API on top of an FSA `FileSystemDirectoryHandle`.
This lets `fs`-based packages run in the browser against OPFS or a directory the
user granted access to.

```ts
import { FsaNodeFs } from 'memfs/lib/fsa-to-node';

const fs = new FsaNodeFs(dir); // dir: a FileSystemDirectoryHandle (or a Promise of one)

await fs.promises.writeFile('/hello.txt', 'Hello World!');
await fs.promises.readFile('/hello.txt', 'utf8'); // 'Hello World!'
```

Out of the box the **asynchronous** methods are supported --- the callback API,
the promises API, `createReadStream`, and `createWriteStream`:

```ts
fs.mkdir('/dir', err => {
  /* ... */
});
fs.createWriteStream('/out.bin').end(Buffer.from([1, 2, 3]));
```

### Synchronous API

The FSA API is asynchronous, so synchronous `fs` methods (`readFileSync`, `writeFileSync`, ...)
need a helper that blocks the calling thread. `memfs` does this with a **Web Worker**
plus `Atomics`/`SharedArrayBuffer`: the sync call parks on the main thread while
the worker performs the async FSA work.

Wire up the sync adapter and pass it to `FsaNodeFs`:

```ts
import { FsaNodeFs, FsaNodeSyncAdapterWorker } from 'memfs/lib/fsa-to-node';

const adapter = await FsaNodeSyncAdapterWorker.start('https://<path>/worker.js', dir);
const fs = new FsaNodeFs(dir, adapter);

fs.writeFileSync('/hello.txt', 'Hello World!'); // now synchronous methods work
```

The worker file instantiates a `FsaNodeSyncWorker` (imported from the
underlying package --- it is not re-exported through the `memfs/lib/fsa-to-node`
entry point):

```ts
import { FsaNodeSyncWorker } from '@jsonjoy.com/fs-fsa-to-node/lib/worker/FsaNodeSyncWorker';

if (typeof window === 'undefined') {
  const worker = new FsaNodeSyncWorker();
  worker.start();
}
```

`SharedArrayBuffer` and `Atomics` require the page to be
[cross-origin isolated](https://web.dev/cross-origin-isolation-guide/): serve
over HTTPS and send these response headers.

```ts
// webpack devServer
{
  devServer: {
    https: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
}
```

With that in place, most synchronous methods work too.

## Demos

The repository ships runnable browser demos:

- **Async API and `WriteStream`** --- `yarn demo:fsa-to-node-zipfile`
- **Synchronous API over a worker** --- `yarn demo:fsa-to-node-sync-tests`
- **`isomorphic-git` on OPFS / FSA** --- `yarn demo:git-opfs`, `yarn demo:git-fsa`
