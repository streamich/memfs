# Missing Node.js fs APIs in memfs

This document lists the Node.js filesystem APIs that are not yet implemented in memfs.

## APIs with stub implementations (throw "Not implemented")

These APIs are defined with proper TypeScript types but currently throw "Not implemented" errors when called:

### File System Statistics

- `fs.statfs(path[, options], callback)` - Get file system statistics
- `fs.statfsSync(path[, options])` - Synchronous version of statfs
- `fs.promises.statfs(path[, options])` - Promise-based statfs

### File as Blob (Node.js 19+)

- `fs.openAsBlob(path[, options])` - Open a file as a Blob object for web API compatibility

### Pattern Matching (Node.js 20+)

- `fs.glob(pattern[, options], callback)` - Find files matching a glob pattern
- `fs.globSync(pattern[, options])` - Synchronous version of glob
- `fs.promises.glob(pattern[, options])` - Promise-based glob

## Implementation Status

### ✅ Fully Implemented APIs

All core Node.js fs APIs are implemented including:

- Basic file operations (read, write, open, close, etc.)
- Directory operations (mkdir, rmdir, readdir, etc.)
- File metadata (stat, lstat, fstat, chmod, chown, utimes, etc.)
- Symbolic links (symlink, readlink, etc.)
- File watching (watch, watchFile, unwatchFile)
- Streams (createReadStream, createWriteStream)
- File copying (copyFile, cp)
- File truncation (truncate, ftruncate)

### 🚧 Stubbed APIs (not implemented)

- `statfs` / `statfsSync` - File system statistics
- `openAsBlob` - Open file as Blob
- `glob` / `globSync` - Pattern matching

## Usage

When calling these unimplemented APIs, they will throw an error:

```javascript
const { Volume } = require('memfs');
const vol = new Volume();

try {
  vol.globSync('*.js');
} catch (err) {
  console.log(err.message); // "Not implemented"
}
```

## TypeScript Support

All missing APIs have proper TypeScript type definitions:

```typescript
interface IGlobOptions {
  cwd?: string | URL;
  exclude?: string | string[];
  maxdepth?: number;
  withFileTypes?: boolean;
}

interface IOpenAsBlobOptions {
  type?: string;
}
```

## Contributing

To implement any of these missing APIs:

1. Replace the `notImplemented` stub with actual implementation
2. Add tests for the new functionality
3. Update this documentation

## References

- [Node.js fs API Documentation](https://nodejs.org/api/fs.html)
- [memfs source code](https://github.com/streamich/memfs)
