# Node `fs` API to File System Access API

`memfs` implements the web [File System Access (FSA) API][fsa] (formerly known as
Native File System API) on top of Node's `fs`-like filesystem API. This means you
can instantiate an FSA-compatible API on top of Node.js `fs` module,
or on top of `memfs` [in-memory filesystem](../node/index.md), or on top of any
other filesystem that implements Node's `fs` API.

[fsa]: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

## Usage

Crate a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) out
of any folder on your filesystem:

```js
import { nodeToFsa } from 'memfs/lib/node-to-fsa';

const dir = nodeToFsa(fs, '/path/to/folder', { mode: 'readwrite' });
```

The `fs` Node filesystem API can be the real `fs` module or any `fs` like object, for example,
an in-memory one provided by `memfs`.

Now you can use the `dir` handle to execute all the File System Access API
methods, for example, create a new file:

```js
const file = await dir.getFileHandle('foo.txt', { create: true });
```
