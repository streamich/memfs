# @jsonjoy.com/fs-print

File system tree printer - print a file system structure as a tree.

Provides a simple API to print any filesystem implementing the `FsSynchronousApi` interface
as a formatted tree structure, useful for debugging and visualization.

## Installation

```bash
npm install @jsonjoy.com/fs-print
```

## Usage

```ts
import { toTreeSync } from '@jsonjoy.com/fs-print';
import { memfs } from 'memfs';

const { fs } = memfs({
  '/readme.md': '...',
  '/src/index.ts': '...',
  '/src/util.ts': '...',
});

console.log(toTreeSync(fs));
```

Output:

```
/
├─ src/
│  ├─ index.ts
│  └─ util.ts
└─ readme.md
```

## Options

You can customize the output with options:

```ts
toTreeSync(fs, {
  dir: '/src', // Starting directory (default: '/')
  depth: 2, // Maximum depth to traverse (default: 10)
  separator: '/', // Path separator (default: '/')
  tab: '  ', // Indentation string (default: '')
  sort: true, // Sort entries (default: true)
});
```

## License

Apache-2.0
