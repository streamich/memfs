# @jsonjoy.com/fs-fsa-to-node

Adapter to convert [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (`FileSystemDirectoryHandle`) to Node.js `fs`-like API.

## Installation

```bash
npm install @jsonjoy.com/fs-fsa-to-node
```

## Usage

```ts
import { FsaNodeFs } from '@jsonjoy.com/fs-fsa-to-node';

// Get a FileSystemDirectoryHandle (e.g., from showDirectoryPicker())
const dirHandle = await window.showDirectoryPicker();

// Create a Node.js fs-like API from the directory handle
const fs = new FsaNodeFs(dirHandle);

// Use familiar Node.js fs API
await fs.promises.writeFile('/test.txt', 'Hello, World!');
const content = await fs.promises.readFile('/test.txt', 'utf8');
console.log(content); // 'Hello, World!'
```

## Features

- Provides Node.js `fs` callback and Promise APIs
- Works with any `FileSystemDirectoryHandle` implementation
- Supports file operations: read, write, append, truncate
- Supports directory operations: mkdir, readdir, rmdir
- Includes read and write streams
- Supports `fs.watch` and `fs.watchFile`

## Watching

`fs.watch` is powered by a [`FileSystemObserver`][observer]: the constructor
passed through the `FileSystemObserver` option is used when provided, otherwise
the global one — shipped natively in Chrome 133+, which makes `fs.watch` work
over real OPFS in the browser.

```ts
const fs = new FsaNodeFs(dirHandle, undefined, { FileSystemObserver });

const watcher = fs.watch('/', { recursive: true }, (eventType, filename) => {
  console.log(eventType, filename);
});
```

Divergences from Node.js:

- The FSA backend is asynchronous, so startup errors (e.g. a missing path) are
  emitted as an `'error'` event on the returned watcher instead of being
  thrown synchronously. The `ignore`, `signal`, and `throwIfNoEntry` options
  are not supported, and `persistent` is a no-op.
- `fs.watchFile` polls the file at `interval` — comparing the handle's
  `File#lastModified` and size — since the FSA API exposes no stat change
  notifications.

[observer]: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver

## License

[Apache-2.0](LICENSE)
