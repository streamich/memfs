# In-memory File System Access (FSA) API implementation

In-memory file-system with browser FSA API. Construct a new instance:

## Quick Start

Create a new instance of FSA filesystem:

```ts
import { fsa } from 'memfs/lib/fsa';

// Create a new filesystem.
const { dir, core } = fsa({ mode: 'readwrite' });

// Create a folder and a file.
const dir2 = await dir.getDirectoryHandle('new-folder', { create: true });
const file = await dir2.getFileHandle('file.txt', { create: true });
await (await file.createWritable()).write('Hello, world!');

// Export whole filesystem to JSON.
console.log(core.toJSON());
// { '/new-folder/file.txt': 'Hello, world!' }
```

Create a new FSA filesystem from JSON:

```ts
const { dir, core } = fsa({ mode: 'readwrite' });

// Import JSON.
core.fromJSON(
  {
    'documents/readme.txt': 'Welcome!',
    'photos/vacation.jpg': Buffer.from('fake-jpg-data'),
    'empty-folder': null,
  },
  '/',
);

// Use FSA API.
const dir2 = await dir.getDirectoryHandle('documents');
const file = await dir2.getFileHandle('readme.txt');
const fileContent = await file.getFile();
console.log(await fileContent.text()); // 'Welcome!'
```
