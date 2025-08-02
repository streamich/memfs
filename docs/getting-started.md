# Getting Started with memfs

memfs is a complete in-memory file system implementation that provides Node.js `fs` API compatibility and browser File System Access (FSA) API support.

## Installation

```bash
npm install memfs
```

## Quick Start

### Basic Usage

```js
import { fs } from 'memfs';

// Write a file
fs.writeFileSync('/hello.txt', 'World!');

// Read a file
const content = fs.readFileSync('/hello.txt', 'utf8');
console.log(content); // World!
```

### Creating a File System from JSON

You can initialize a file system from a JSON object:

```js
import { fs, vol } from 'memfs';

const files = {
  './README.md': '# My Project',
  './src/index.js': 'console.log("Hello, world!");',
  './package.json': JSON.stringify({ name: 'my-project', version: '1.0.0' }),
};

vol.fromJSON(files, '/app');

// Now you can access the files
console.log(fs.readFileSync('/app/README.md', 'utf8')); // # My Project
console.log(fs.readFileSync('/app/src/index.js', 'utf8')); // console.log("Hello, world!");
```

### Creating Multiple Volumes

Create separate, isolated file systems:

```js
import { Volume } from 'memfs';

// Create first volume
const vol1 = Volume.fromJSON({ '/config.json': '{"env": "dev"}' });

// Create second volume
const vol2 = Volume.fromJSON({ '/config.json': '{"env": "prod"}' });

// They are completely separate
console.log(vol1.readFileSync('/config.json', 'utf8')); // {"env": "dev"}
console.log(vol2.readFileSync('/config.json', 'utf8')); // {"env": "prod"}
```

## Common Use Cases

### Testing

Perfect for unit tests where you need a predictable file system:

```js
import { vol } from 'memfs';

beforeEach(() => {
  vol.reset(); // Clear the file system
  vol.fromJSON({
    '/project/package.json': JSON.stringify({ name: 'test-project' }),
    '/project/src/index.js': 'module.exports = "hello";',
  });
});

test('should read package.json', () => {
  const pkg = JSON.parse(vol.readFileSync('/project/package.json', 'utf8'));
  expect(pkg.name).toBe('test-project');
});
```

### Browser Environment

Use with bundlers like webpack or Vite:

```js
import { fs } from 'memfs';

// Create some files in memory
fs.writeFileSync('/data.txt', 'Browser data');
fs.mkdirSync('/uploads');

// Read directory contents
const files = fs.readdirSync('/');
console.log(files); // ['data.txt', 'uploads']
```

### File System Access API (Browser)

For modern browsers with File System Access API support:

```js
import { fsa } from 'memfs/lib/fsa';

// Create a new FSA-compatible filesystem
const { dir, core } = fsa({ mode: 'readwrite' });

// Create folders and files using FSA API
const folder = await dir.getDirectoryHandle('documents', { create: true });
const file = await folder.getFileHandle('note.txt', { create: true });

// Write to file
const writable = await file.createWritable();
await writable.write('My note content');
await writable.close();

// Export to JSON
console.log(core.toJSON()); // { '/documents/note.txt': 'My note content' }
```

## Next Steps

- [Testing Usage Guide](./testing-usage.md) - Learn how to use memfs in your tests
- [Browser Usage Guide](./browser-usage.md) - Use memfs in browser environments
- [Node.js fs API Reference](./node/index.md) - Complete Node.js fs API implementation
- [File System Access API Reference](./fsa/fsa.md) - Browser FSA API implementation
- [API Documentation](https://streamich.github.io/memfs/) - Complete TypeDoc reference

## Examples

Explore the [demo folder](../demo) for comprehensive examples including:

- Git integration in the browser
- File system synchronization
- Advanced usage patterns
