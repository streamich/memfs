# `snapshot` utility

The `snapshot` utility allows to create `fs` file system directory or file
snapshots. It recursively creates a snapshot of the specified directory. Later the
snapshot can be unpacked back into some directory. It supports symlinks.

## Usage

The functionality is exposed as a collection of utility functions.

```ts
import * as snapshot from 'memfs/lib/snapshot';
```

- `snapshot.toSnapshotSync()` &mdash; returns POJO snapshot synchronously.
- `snapshot.toSnapshot()` &mdash; returns POJO snapshot asynchronously.
- `snapshot.fromSnapshotSync()` &mdash; imports POJO snapshot synchronously.
- `snapshot.fromSnapshot()` &mdash; imports POJO snapshot asynchronously.
- `snapshot.toBinarySnapshotSync()` &mdash; returns CBOR `Uint8Array` snapshot synchronously.
- `snapshot.toBinarySnapshot()` &mdash; returns CBOR `Uint8Array` snapshot asynchronously.
- `snapshot.fromBinarySnapshotSync()` &mdash; imports CBOR `Uint8Array` snapshot synchronously.
- `snapshot.fromBinarySnapshot()` &mdash; imports CBOR `Uint8Array` snapshot asynchronously.
- `snapshot.toJsonSnapshotSync()` &mdash; returns JSON `Uint8Array` snapshot synchronously.
- `snapshot.toJsonSnapshot()` &mdash; returns JSON `Uint8Array` snapshot asynchronously.
- `snapshot.fromJsonSnapshotSync()` &mdash; imports JSON `Uint8Array` snapshot synchronously.
- `snapshot.fromJsonSnapshot()` &mdash; imports JSON `Uint8Array` snapshot asynchronously.

## POJO snapshot

You can convert any folder of an `fs`-like file system into a POJO snapshot.

```ts
const snap = snapshot.toSnapshotSync({ fs, dir });
const snap = await snapshot.toSnapshot({ fs: fs.promises, dir });
```

Then import it back from snapshot.

```ts
snapshot.fromSnapshotSync(snap, { fs, dir });
await snapshot.fromSnapshot(snap, { fs: fs.promises, dir });
```

## Binary snapshot

Binary snapshots are encoded as CBOR `Uint8Array` buffers. You can convert any
folder of an `fs`-like file system into a `Uint8Array` snapshot.

```ts
const uint8 = snapshot.toBinarySnapshotSync({ fs, dir });
const uint8 = await snapshot.toBinarySnapshot({ fs: fs.promises, dir });
```

Then import it back from `Uint8Array` snapshot.

```ts
snapshot.fromBinarySnapshotSync(uint8, { fs, dir });
await snapshot.fromBinarySnapshot(uint8, { fs: fs.promises, dir });
```

## JSON snapshot

JSON snapshots use JSON encoding, but they also support binary data. The binary
data is encoded as Base64 data URL strings. The resulting JSON is returned as
`Uint8Array` buffer.

You can convert any folder of an `fs`-like file system into a `Uint8Array` snapshot.

```ts
const uint8 = snapshot.toJsonSnapshotSync({ fs, dir });
const uint8 = await snapshot.toJsonSnapshot({ fs: fs.promises, dir });
```

Then import it back from `Uint8Array` snapshot.

```ts
snapshot.fromJsonSnapshotSync(uint8, { fs, dir });
await snapshot.fromJsonSnapshot(uint8, { fs: fs.promises, dir });
```

## Encoding format

The snapshot follows [Compact JSON](https://jsonjoy.com/specs/compact-json) encoding
scheme, where each node is encoded as an array tuple, where the first element
is the node type.

### Directory node

Directory nodes are have type `0`, the second tuple element is the metadata object, and
the third element is a map of child nodes.

```ts
[
  0,
  {},
  {
    file: [1, {}, new Uint8Array([1, 2, 3])],
  },
];
```

### File node

File nodes have type `1`, the second tuple element is the metadata object, and
the third element is the file content encoded as `Uint8Array`.

```ts
[1, {}, new Uint8Array([1, 2, 3])];
```

### Symlink node

Symlink nodes have type `2`, the second tuple element is the metadata object.

```ts
[2, { target: 'file' }];
```
