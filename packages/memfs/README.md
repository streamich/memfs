# memfs

In-memory file system with Node.js `fs` API and browser File System (Access) API.

[![npm][npm-badge]][npm-url]

[npm-badge]: https://img.shields.io/npm/v/memfs.svg
[npm-url]: https://www.npmjs.com/package/memfs

## Overview

`memfs` is a JavaScript library that implements an in-memory file system compatible with Node.js `fs` module and the browser File System (Access) API. Use it for testing, mocking file systems, or creating virtual file systems in both Node.js and browser environments.

## Installation

```bash
npm install memfs
```

## Quick Start

### Node.js `fs` API

```javascript
import { fs } from 'memfs';

// Write a file
fs.writeFileSync('/hello.txt', 'Hello, World!');

// Read a file
const content = fs.readFileSync('/hello.txt', 'utf-8');
console.log(content); // "Hello, World!"

// Create a directory
fs.mkdirSync('/mydir');

// List directory contents
console.log(fs.readdirSync('/')); // ['hello.txt', 'mydir']
```

### Browser File System API

```javascript
import { fsa } from 'memfs';

// Get root directory handle
const root = await fsa.getRoot();

// Create a file
const file = await root.getFileHandle('hello.txt', { create: true });
const writable = await file.createWritable();
await writable.write('Hello, World!');
await writable.close();

// Read the file
const readable = await file.getFile();
const text = await readable.text();
console.log(text); // "Hello, World!"
```

## Features

- Node.js `fs` module API compatibility
- Browser File System (Access) API implementation
- Adapters between `fs` and File System API
- Directory snapshots and tree printing utilities
- Works in Node.js and modern browsers
- TypeScript support

## Documentation

For detailed documentation and more examples, visit the [main project page](https://github.com/streamich/memfs).

## License

Apache 2.0
