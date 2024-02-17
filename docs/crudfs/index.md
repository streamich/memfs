# `crudfs`

`crudfs` is a CRUD-like file system abstraction. It is a thin wrapper around a
real file system, which allows to perform CRUD operations on files and folders.
It is intended to be light (so can be efficiently bundled for browser),
have small API surface but cover most of the useful file manipulation scenarios.

Folder are referred to as _collections_ or _types_; and files are referred to as _resources_.

## Usage

### `crudfs` from File System Access API

You can construct `crudfs` on top of the File System Access API `FileSystemDirectoryHandle` like so:

```js
import { FsaCrud } from 'memfs/lib/fsa-to-crud';

const crud = new FsaCrud(dirHandle);
```

Now you can use the `crud` instance to execute CRUD operations on the file system.
See the available methods [here](../../src/crud/types.ts).

In this below example we create a `/user/files` collection which contains two files:

```js
await crud.put(['user', 'files'], 'file1.bin', new Uint8Array([1, 2, 3]));
await crud.put(['user', 'files'], 'file2.bin', new Uint8Array([1, 2, 3]));
```

We can list all resources in the `/user/files` collection:

```js
const files = await crud.list(['user', 'files']);
```

Retrieve a resource contents:

```js
const file1 = await crud.get(['user', 'files'], 'file1.bin');
```

Delete a resource:

```js
await crud.delete(['user', 'files'], 'file1.bin');
```

Drop all resources in a collection:

```js
await crud.drop(['user', 'files']);
```

### `crudfs` from Node.js `fs` module

You can run `crudfs` on top of Node.js `fs` module like so:

```js
import * as fs from 'fs';
import { NodeCrud } from 'memfs/lib/node-to-crud';

const crud = new NodeCrud({ fs: fs.promises, dir: '/path/to/folder' });
```

#### Indirectly with FAS in-between

You can run `crudfs` on top of Node.js `fs` module by using File System Access API
adapter on top of the Node.js `fs` module:

```js
import * as fs from 'fs';
import { nodeToFsa } from 'memfs/lib/node-to-fsa';
import { FsaCrud } from 'memfs/lib/fsa-to-crud';

const dir = nodeToFsa(fs, '/path/to/folder', { mode: 'readwrite' });
const crud = new FsaCrud(dir);
```
