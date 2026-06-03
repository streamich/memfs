The browser [File System Access (FSA) API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
hands you a `FileSystemDirectoryHandle` and you navigate from
there --- `getDirectoryHandle`, `getFileHandle`, `createWritable`, and so on. `memfs`
provides a complete **in-memory** implementation of that API, useful for
testing FSA/OPFS code in Node and for sandboxes that have no real disk.

```ts
import { fsa } from 'memfs/lib/fsa';

const { dir, core } = fsa({ mode: 'readwrite' });

const folder = await dir.getDirectoryHandle('new-folder', { create: true });
const file = await folder.getFileHandle('file.txt', { create: true });
await (await file.createWritable()).write('Hello, world!');

core.toJSON(); // {'/new-folder/file.txt': 'Hello, world!'}
```

## `fsa()`

```ts
fsa(
  ctx?: Partial<CoreFsaContext>,
  core?: Superblock,   // defaults to a fresh in-memory filesystem
  dirPath?: string,    // root for the returned handle, defaults to '/'
): {
  core: Superblock;                // the backing filesystem (toJSON / fromJSON)
  dir: FileSystemDirectoryHandle;  // handle rooted at dirPath
  FileSystemObserver: ...;         // change-observer constructor
};
```

The context controls behaviour:

| Option              | Meaning                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `mode`              | `'read'` (default) or `'readwrite'`. Write operations require `'readwrite'` |
| `separator`         | Path separator used by `core.toJSON` / `fromJSON`. Defaults to `'/'`        |
| `syncHandleAllowed` | Enables `createSyncAccessHandle()` on file handles. Defaults to `false`     |
| `locks`             | A `FileLockManager` controlling concurrent-write locks                      |

`core` is a `Superblock` --- the same in-memory store that backs `Volume` ---
so you can serialize and seed the filesystem directly:

```ts
const { dir, core } = fsa({ mode: 'readwrite' });

core.fromJSON({
  'documents/readme.txt': 'Welcome!',
  'photos/vacation.jpg': Buffer.from('...'),
  'empty-folder': null,
});

const docs = await dir.getDirectoryHandle('documents');
const readme = await docs.getFileHandle('readme.txt');
await (await readme.getFile()).text(); // 'Welcome!'
```

```jj.aside
The in-memory FSA filesystem and a `Volume` are backed by the same `Superblock`
storage engine, so one store can be driven through *both* APIs at once: hand
`fsa()`'s `core` to `new Volume(core)` and the same files are visible through
the Node `fs` API and through FSA handles simultaneously.
```

## Directory handles

A directory handle (`FileSystemDirectoryHandle`) supports the standard async
methods:

| Method                                | Description                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| `getDirectoryHandle(name, {create?})` | Get or create a subdirectory                                       |
| `getFileHandle(name, {create?})`      | Get or create a file                                               |
| `removeEntry(name, {recursive?})`     | Delete a file or directory                                         |
| `keys()` / `values()` / `entries()`   | Async iterators over children                                      |
| `resolve(handle)`                     | Relative path (as `string[]`) from here to a descendant, or `null` |

```ts
for await (const [name, handle] of dir.entries()) {
  handle.kind; // 'file' | 'directory'
}
```

## File handles

A file handle (`FileSystemFileHandle`) reads via `getFile()` and writes via a
writable stream:

| Method                                | Description                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| `getFile()`                           | Returns a `File` (use `.text()`, `.arrayBuffer()`, `.stream()`) |
| `createWritable({keepExistingData?})` | Opens a `FileSystemWritableFileStream`                          |
| `createSyncAccessHandle()`            | Synchronous read/write handle (only when `syncHandleAllowed`)   |

## Writable streams

`createWritable()` returns a `FileSystemWritableFileStream`. Write plain data,
or structured write commands to seek and truncate:

```ts
const file = await dir.getFileHandle('log.csv', { create: true });
const writable = await file.createWritable();

await writable.write('timestamp,level\n'); // append data
await writable.write({ type: 'write', position: 0, data: 'X' }); // write at offset
await writable.write({ type: 'seek', position: 4 }); // move cursor
await writable.write({ type: 'truncate', size: 10 }); // resize
await writable.close(); // commit
```

```jj.note
Writable streams take a **lock** on the file for the duration. A second
`createWritable()` on the same file while one is open is rejected --- matching
browser behaviour. The lock is released on `close()` or `abort()`.
```

## Sync access handles

When `syncHandleAllowed` is set, file handles expose
`createSyncAccessHandle()` --- the OPFS worker API with
`read`/`write`/`getSize`/`truncate`/`flush`/`close`:

```ts
const { dir } = fsa({ mode: 'readwrite', syncHandleAllowed: true });
const file = await dir.getFileHandle('data.bin', { create: true });
const access = await file.createSyncAccessHandle();

await access.write(new Uint8Array([1, 2, 3]), { at: 0 });
await access.getSize(); // 3
await access.close();
```

```jj.note
The browser spec defines the sync-access-handle methods as *synchronous*. This
in-memory implementation returns promises instead, so `await` them.
```

To go the other direction --- an `fs`-like API on top of an FSA handle, or FSA
handles on top of an `fs` filesystem --- see [Adapters](/libs/memfs/adapters).
