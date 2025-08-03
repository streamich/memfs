# memfs Documentation

> In-memory file system for Node.js and browsers

memfs is a complete in-memory file system implementation that provides Node.js `fs` API compatibility and browser File System Access (FSA) API support. Perfect for testing, browser applications, and any scenario where you need a fast, predictable file system that doesn't touch the disk.

## Quick Start

```bash
npm install memfs
```

```js
import { fs } from 'memfs';

fs.writeFileSync('/hello.txt', 'World!');
fs.readFileSync('/hello.txt', 'utf8'); // World!
```

## Documentation

### 🚀 [Getting Started](./getting-started.md)

Learn the basics of memfs with practical examples covering file operations, JSON initialization, and common patterns.

### 🧪 [Testing Usage](./testing-usage.md)

Comprehensive guide for using memfs in unit tests, integration tests, and mocking file system operations.

### 🌐 [Browser Usage](./browser-usage.md)

Everything you need to know about using memfs in browsers, including FSA API, bundler configuration, and PWA integration.

### 📚 API References

#### Node.js fs API

- **[Node.js fs API Implementation](./node/index.md)** - Complete guide to the Node.js-compatible fs API
- **[Usage Examples](./node/usage.md)** - Practical examples and patterns
- **[API Reference](./node/reference.md)** - Detailed API documentation

#### File System Access API

- **[FSA API Guide](./fsa/fsa.md)** - Browser File System Access API implementation
- **[fs to FSA Adapter](./fsa/fs-to-fsa.md)** - Bridge Node.js fs API to browser FSA API
- **[FSA to fs Adapter](./fsa/fsa-to-fs.md)** - Use FSA API with Node.js fs interface

#### Experimental APIs

- **[CRUD File System](./crudfs/index.md)** - High-level CRUD operations `experimental`
- **[CAS File System](./casfs/index.md)** - Content Addressable Storage `experimental`

### 🛠️ Utilities

- **[Directory Snapshots](./snapshot/index.md)** - Serialize and restore file system state
- **[Directory Tree Printing](./print/index.md)** - Pretty-print directory structures

### 🔗 [Complete API Documentation](https://streamich.github.io/memfs/)

TypeDoc-generated API reference with complete type information and examples.

## Features

- ✅ **Complete Node.js fs API** - All major fs methods implemented
- ✅ **Browser compatible** - Works in all modern browsers
- ✅ **File System Access API** - Modern browser file system interface
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Zero dependencies** - Lightweight and self-contained
- ✅ **Testing friendly** - Perfect for unit tests and mocking
- ✅ **JSON serialization** - Export/import entire file systems
- ✅ **Stream support** - ReadStream and WriteStream implementations
- ✅ **Symlinks & hardlinks** - Full link support like real file systems
- ✅ **Async/sync APIs** - Both callback and promise-based operations

## Use Cases

### Testing

```js
import { vol } from 'memfs';

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    '/project/package.json': JSON.stringify({ name: 'test' }),
    '/project/src/index.js': 'console.log("test");',
  });
});
```

### Browser Applications

```js
import { fsa } from 'memfs/lib/fsa';

const { dir } = fsa({ mode: 'readwrite' });
const file = await dir.getFileHandle('data.txt', { create: true });
```

### Mocking File Systems

```js
import { patchFs } from 'fs-monkey';
import { vol } from 'memfs';

// Replace Node.js fs with memfs
patchFs(vol);
```

## Examples

Explore comprehensive examples in the [demo directory](../demo/):

- **[Git in Browser (FSA)](../demo/git-fsa/README.md)** - Git operations with File System Access API
- **[Git in Browser (OPFS)](../demo/git-opfs/README.md)** - Git with Origin Private File System
- **[fs to FSA Bridge](../demo/fsa-to-node-zipfile/README.md)** - Create real files from memory
- **[Sync File Operations](../demo/fsa-to-node-sync-tests/README.md)** - Synchronous browser file operations
- **[CRUD & CAS Demo](../demo/crud-and-cas/README.md)** - Advanced file system patterns

## Performance

memfs is designed for speed and efficiency:

- Files stored directly in memory for instant access
- No I/O blocking or disk latency
- Optimized for both small files and large binary data
- Streaming support for memory-efficient large file operations

## Ecosystem

memfs works great with other streamich file system libraries:

- **[unionfs](https://github.com/streamich/unionfs)** - Union multiple file systems
- **[fs-monkey](https://github.com/streamich/fs-monkey)** - Monkey-patch Node.js fs
- **[linkfs](https://github.com/streamich/linkfs)** - Redirect file system paths
- **[spyfs](https://github.com/streamich/spyfs)** - Spy on file system operations

## Contributing

memfs is open source! Check out the [GitHub repository](https://github.com/streamich/memfs) to:

- Report bugs or request features
- Submit pull requests
- Read the source code
- See test coverage at [streamich.github.io/memfs/coverage/](https://streamich.github.io/memfs/coverage/)

## License

Apache 2.0
