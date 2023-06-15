# `memfs` File System Access API

`memfs` implements the web [File System Access API][fsa] (formerly known as
Native File System API) on top of Node's `fs`-like filesystem API.

[fsa]: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API


## Usage

Crate a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) out
of any folder on your filesystem:

```js
import { nodeToFsa } from 'memfs/lib/node-to-fsa';

const dir = nodeToFsa(fs, '/path/to/folder');
```

The `fs` Node filesystem API can be the real `fs` module or any, for example,
an in-memory one provided by `memfs`.

Now you can use the `dir` handle to execute any of the File System Access API
methods, for example, create a new file:

```js
const file = await dir.getFileHandle('foo.txt', { create: true });
```
