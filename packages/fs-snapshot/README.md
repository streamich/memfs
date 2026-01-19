# @jsonjoy.com/fs-snapshot

File system snapshot - serialize and deserialize file system trees to binary (CBOR) or JSON format.

## Installation

```bash
npm install @jsonjoy.com/fs-snapshot
```

## Features

- Serialize entire file system trees into compact binary (CBOR) or JSON snapshots
- Restore file system trees from snapshots
- Supports files, directories, and symbolic links
- Both synchronous and asynchronous APIs
- Works with any Node.js-compatible `fs` module

## Usage

### Synchronous API

```ts
import * as fs from 'fs';
import { toSnapshotSync, fromSnapshotSync } from '@jsonjoy.com/fs-snapshot';

// Create a snapshot of a directory
const snapshot = toSnapshotSync({ fs, path: '/path/to/directory' });

// Restore the snapshot to a different location
fromSnapshotSync(snapshot, { fs, path: '/path/to/restore' });
```

### Asynchronous API

```ts
import * as fs from 'fs';
import { toSnapshot, fromSnapshot } from '@jsonjoy.com/fs-snapshot';

// Create a snapshot of a directory
const snapshot = await toSnapshot({ fs: fs.promises, path: '/path/to/directory' });

// Restore the snapshot to a different location
await fromSnapshot(snapshot, { fs: fs.promises, path: '/path/to/restore' });
```

### Binary (CBOR) Snapshots

Binary snapshots are more compact and faster to serialize/deserialize:

```ts
import * as fs from 'fs';
import { toBinarySnapshotSync, fromBinarySnapshotSync } from '@jsonjoy.com/fs-snapshot';

// Create a binary snapshot
const binary = toBinarySnapshotSync({ fs, path: '/path/to/directory' });

// Restore from binary snapshot
fromBinarySnapshotSync(binary, { fs, path: '/path/to/restore' });
```

### JSON Snapshots

JSON snapshots are human-readable and easier to debug:

```ts
import * as fs from 'fs';
import { toJsonSnapshotSync, fromJsonSnapshotSync } from '@jsonjoy.com/fs-snapshot';

// Create a JSON snapshot
const jsonSnapshot = toJsonSnapshotSync({ fs, path: '/path/to/directory' });

// Restore from JSON snapshot
fromJsonSnapshotSync(jsonSnapshot, { fs, path: '/path/to/restore' });
```

## Snapshot Format

Snapshots are represented as tuples with the following structure:

- **Folder**: `[0, metadata, { entries }]`
- **File**: `[1, metadata, Uint8Array]`
- **Symlink**: `[2, { target: string }]`

## License

Apache-2.0
