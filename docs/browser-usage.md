# Browser Usage Guide

memfs provides excellent browser support, offering both Node.js-style `fs` API and modern File System Access (FSA) API implementations that work entirely in memory.

## Installation for Browser

### Using a Bundler (Recommended)

With webpack, Vite, Rollup, or similar:

```bash
npm install memfs
```

```js
import { fs, vol } from 'memfs';
// or
import { fsa } from 'memfs/lib/fsa';
```

### Using CDN

```html
<!-- For ES modules -->
<script type="module">
  import { fs, vol } from 'https://unpkg.com/memfs@latest/dist/index.mjs';
</script>

<!-- For UMD (older browsers) -->
<script src="https://unpkg.com/memfs@latest/dist/index.js"></script>
<script>
  const { fs, vol } = memfs;
</script>
```

## Node.js fs API in Browser

### Basic File Operations

```js
import { fs, vol } from 'memfs';

// Create files and directories
fs.mkdirSync('/app');
fs.writeFileSync(
  '/app/config.json',
  JSON.stringify({
    name: 'My Browser App',
    version: '1.0.0',
  }),
);

// Read files
const config = JSON.parse(fs.readFileSync('/app/config.json', 'utf8'));
console.log(config.name); // "My Browser App"

// List directory contents
const files = fs.readdirSync('/app');
console.log(files); // ['config.json']
```

### Working with Binary Data

```js
import { fs } from 'memfs';

// Write binary data
const imageData = new Uint8Array([137, 80, 78, 71]); // PNG header
fs.writeFileSync('/images/logo.png', imageData);

// Read binary data
const buffer = fs.readFileSync('/images/logo.png');
console.log(buffer); // Uint8Array([137, 80, 78, 71])
```

### Async Operations

```js
import { fs } from 'memfs';

// Using callbacks
fs.writeFile('/data.txt', 'Hello, browser!', err => {
  if (err) throw err;

  fs.readFile('/data.txt', 'utf8', (err, data) => {
    if (err) throw err;
    console.log(data); // "Hello, browser!"
  });
});

// Using promises
async function browserFileOps() {
  await fs.promises.writeFile('/async-data.txt', 'Async content');
  const content = await fs.promises.readFile('/async-data.txt', 'utf8');
  console.log(content); // "Async content"
}
```

## File System Access (FSA) API

The FSA API provides a modern, Promise-based interface that's compatible with the browser's File System Access API.

### Basic FSA Usage

```js
import { fsa } from 'memfs/lib/fsa';

// Create a new filesystem
const { dir, core } = fsa({ mode: 'readwrite' });

async function fsaExample() {
  // Create a directory
  const documentsDir = await dir.getDirectoryHandle('documents', { create: true });

  // Create a file
  const file = await documentsDir.getFileHandle('readme.txt', { create: true });

  // Write to the file
  const writable = await file.createWritable();
  await writable.write('Welcome to my browser app!');
  await writable.close();

  // Read the file
  const fileObject = await file.getFile();
  const content = await fileObject.text();
  console.log(content); // "Welcome to my browser app!"

  // Export to JSON for inspection
  console.log(core.toJSON()); // { '/documents/readme.txt': 'Welcome to my browser app!' }
}

fsaExample();
```

### Advanced FSA Operations

```js
import { fsa } from 'memfs/lib/fsa';

const { dir, core } = fsa({ mode: 'readwrite' });

async function advancedFSA() {
  // Create nested directory structure
  const projectDir = await dir.getDirectoryHandle('my-project', { create: true });
  const srcDir = await projectDir.getDirectoryHandle('src', { create: true });

  // Create multiple files
  const files = [
    { name: 'index.js', content: 'console.log("main");' },
    { name: 'utils.js', content: 'export const helper = () => {};' },
    { name: 'config.json', content: JSON.stringify({ env: 'production' }) },
  ];

  for (const { name, content } of files) {
    const file = await srcDir.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  }

  // List directory contents
  for await (const [name, handle] of srcDir.entries()) {
    console.log(name, handle.kind); // "index.js file", "utils.js file", etc.
  }

  // Remove a file
  await srcDir.removeEntry('config.json');

  // Export final structure
  console.log(core.toJSON());
}
```

## Browser-Specific Use Cases

### Single Page Applications (SPA)

```js
import { vol } from 'memfs';

class BrowserAppStorage {
  constructor() {
    this.vol = vol;
    this.initializeStorage();
  }

  initializeStorage() {
    // Create application directory structure
    this.vol.fromJSON({
      '/app/data/users.json': '[]',
      '/app/data/settings.json': JSON.stringify({ theme: 'light' }),
      '/app/cache/': null, // empty directory
      '/app/temp/': null,
    });
  }

  saveUserData(users) {
    this.vol.writeFileSync('/app/data/users.json', JSON.stringify(users));
  }

  getUserData() {
    return JSON.parse(this.vol.readFileSync('/app/data/users.json', 'utf8'));
  }

  updateSettings(settings) {
    const current = JSON.parse(this.vol.readFileSync('/app/data/settings.json', 'utf8'));
    const updated = { ...current, ...settings };
    this.vol.writeFileSync('/app/data/settings.json', JSON.stringify(updated));
  }

  clearCache() {
    // Remove all files in cache directory
    const cacheFiles = this.vol.readdirSync('/app/cache');
    cacheFiles.forEach(file => {
      this.vol.unlinkSync(`/app/cache/${file}`);
    });
  }

  exportData() {
    return this.vol.toJSON();
  }
}

const storage = new BrowserAppStorage();
```

### File Upload Simulation

```js
import { fs } from 'memfs';

class FileUploadSimulator {
  constructor() {
    fs.mkdirSync('/uploads', { recursive: true });
  }

  async simulateUpload(file) {
    // Convert File/Blob to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Save to memfs
    const uploadPath = `/uploads/${file.name}`;
    fs.writeFileSync(uploadPath, buffer);

    return {
      path: uploadPath,
      size: buffer.length,
      type: file.type,
      lastModified: file.lastModified,
    };
  }

  getUploadedFiles() {
    const files = fs.readdirSync('/uploads');
    return files.map(filename => {
      const path = `/uploads/${filename}`;
      const stats = fs.statSync(path);
      return {
        name: filename,
        path,
        size: stats.size,
        uploaded: stats.mtime,
      };
    });
  }

  downloadFile(filename) {
    const buffer = fs.readFileSync(`/uploads/${filename}`);
    const blob = new Blob([buffer]);

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Usage
const uploader = new FileUploadSimulator();

// Handle file input
document.getElementById('fileInput').addEventListener('change', async e => {
  for (const file of e.target.files) {
    const result = await uploader.simulateUpload(file);
    console.log('Uploaded:', result);
  }
});
```

### Progressive Web App (PWA) Storage

```js
import { vol } from 'memfs';

class PWAStorage {
  constructor() {
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    const stored = localStorage.getItem('pwa-memfs');
    if (stored) {
      vol.fromJSON(JSON.parse(stored));
    } else {
      this.initializeDefaults();
    }
  }

  initializeDefaults() {
    vol.fromJSON({
      '/pwa/manifest.json': JSON.stringify({
        name: 'My PWA',
        version: '1.0.0',
        offline: true,
      }),
      '/pwa/data/': null,
      '/pwa/cache/': null,
    });
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    const data = vol.toJSON();
    localStorage.setItem('pwa-memfs', JSON.stringify(data));
  }

  cacheResource(url, content) {
    const filename = url.replace(/[^a-zA-Z0-9]/g, '_');
    vol.writeFileSync(`/pwa/cache/${filename}`, content);
    this.saveToLocalStorage();
  }

  getCachedResource(url) {
    const filename = url.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      return vol.readFileSync(`/pwa/cache/${filename}`, 'utf8');
    } catch {
      return null;
    }
  }
}
```

## Integration with Bundlers

### Webpack Configuration

```js
// webpack.config.js
module.exports = {
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      buffer: require.resolve('buffer/'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

### Vite Configuration

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      util: 'util',
    },
  },
});
```

## Browser Compatibility

- **Modern browsers**: Full support for both fs API and FSA API
- **IE11+**: Basic fs API support with polyfills
- **Mobile browsers**: Full support
- **Node.js compatibility**: Code written for memfs works in both browser and Node.js

## Performance Considerations

- **Memory usage**: Files are stored in memory, so consider total size
- **Persistence**: Data is lost on page refresh unless saved to localStorage/IndexedDB
- **Streaming**: Use createReadStream/createWriteStream for large files
- **Chunking**: Break large operations into smaller chunks to avoid blocking

## Security Considerations

- **Same-origin policy**: memfs data is isolated to your application
- **No file system access**: Cannot access real file system (that's the point!)
- **Memory limits**: Browser memory limits apply to stored data

## Examples and Demos

Check out the [demo folder](../demo) for complete browser examples:

- [Git in browser with FSA](../demo/git-fsa/)
- [File system sync tests](../demo/fsa-to-node-sync-tests/)
- [CRUD and CAS operations](../demo/crud-and-cas/)

## See Also

- [Getting Started Guide](./getting-started.md)
- [Testing Usage Guide](./testing-usage.md)
- [File System Access API Reference](./fsa/fsa.md)
- [API Documentation](https://streamich.github.io/memfs/)
