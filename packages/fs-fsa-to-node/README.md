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

## License

[Apache-2.0](LICENSE)
