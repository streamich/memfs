`crudfs`

`crudfs` is a CRUD-like file system abstraction. It is a thin wrapper around a
real file system, which allows to perform CRUD operations on files and folders.
It is intended to be light (so can be efficiently bundled for browser),
have small API surface but cover most of the useful file manipulation scenarios.

Folder are referred to as *collections* or *types*; and files are referred to as *resources*.


## Usage

### `crudfs` from File System Access API

You can construct `crudfs` on top of the File System Access API `FileSystemDirectoryHandle` like so:

```js
import { FsaCrud } from 'memfs/lib/fsa-to-crud';

const crud = new FsaCrud(dirHandle);
```

Now you can use the `crud` instance to execute CRUD operations on the file system.
See the available methods [here](../../src/crud/types.ts).
