# File System Access API to Node `fs` API

This adapter implements Node's `fs`-like filesystem API on top of the web
[File System Access (FSA) API][fsa].

This allows you to run Node.js code in browser, for example, run any Node.js
package that uses `fs` module.

[fsa]: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

## Usage

You need to get hold of [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) and then
use convert it to `fs`-like filesystem.

```js
import { FsaNodeFs } from 'memfs/lib/fsa-to-node';

const fs = new FsaNodeFs(dir);
```

Now you can use the `fs` filesystem API to execute any of the Node's `fs` methods.

```js
await fs.promises.writeFile('/hello.txt', 'Hello World!');
```

Out ouf the box most asynchronous API methods are supported, including callbacks API,
promises API, write stream, and read stream.

## Synchronous API

It is possible to use synchronous API, but it requires some extra setup. You need
to setup a synchronous filesystem adapter for that. (See sync demo below.)

```js
import { FsaNodeFs, FsaNodeSyncAdapterWorker } from 'memfs/lib/fsa-to-node';

const adapter = await FsaNodeSyncAdapterWorker.start('https://<path>/worker.js', dir);
const fs = new FsaNodeFs(dir, adapter);
```

Where `'https://<path>/worker.js'` is a path to a worker file, which could look like this:

```js
import { FsaNodeSyncWorker } from '../../src/fsa-to-node/worker/FsaNodeSyncWorker';

if (typeof window === 'undefined') {
  const worker = new FsaNodeSyncWorker();
  worker.start();
}
```

You will also need to run your app through HTTPS and with [COI enabled](https://web.dev/cross-origin-isolation-guide/).
Using Webpack dev server you can do it like this:

```js
{
  devServer: {
    // HTTPS is required for Atomics and SharedArrayBuffer to work.
    https: true,
    headers: {
      // These two headers are required for Atomics and SharedArrayBuffer to work.
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
},
```

Now most of the synchronous API should work, see the sync demo below.

## Demos

- Async API and WriteStream: `yarn demo:fsa-to-node-zipfile` - [Readme](../../demo/fsa-to-node-zipfile/README.md)
- Synchronous API: `yarn demo:fsa-to-node-sync-tests` - [Readme](../../demo/fsa-to-node-sync-tests/README.md)
