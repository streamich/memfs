# @jsonjoy.com/fs-fsa

File System Access API implementation backed by `@jsonjoy.com/fs-core` primitives.

Provides a [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
implementation that works with the `Superblock` filesystem abstraction.

## Installation

```bash
npm install @jsonjoy.com/fs-fsa
```

## Usage

```ts
import { fsa } from '@jsonjoy.com/fs-fsa';

const { dir, core, FileSystemObserver } = fsa({ mode: 'readwrite' });

// Create a file
const fileHandle = await dir.getFileHandle('hello.txt', { create: true });
const writable = await fileHandle.createWritable();
await writable.write('Hello, World!');
await writable.close();

// Read a file
const file = await fileHandle.getFile();
const contents = await file.text();
console.log(contents); // 'Hello, World!'
```

## License

Apache-2.0
