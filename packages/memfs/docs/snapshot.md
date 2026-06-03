The snapshot utility captures a directory (or single file) from any `fs`-like
filesystem into a portable value, and restores it later --- recursively, and
preserving **symlinks** and **binary** content. It comes in three encodings:
a plain POJO, a compact CBOR `Uint8Array`, and a JSON `Uint8Array`.

It is published as its own package, which `memfs` already depends on:

```ts
import * as snapshot from '@jsonjoy.com/fs-snapshot';
```

```jj.note
For the simple "string/Buffer contents only" case, a `Volume` has built-in
[`toJSON` / `fromJSON`](/libs/memfs/volumes). Reach for snapshots when you need
to preserve symlinks, round-trip binary data faithfully, or serialize to bytes
(CBOR / JSON) for storage or transport.
```

## Options

Every function takes a target descriptor. The synchronous functions want a
synchronous `fs`; the async ones want a promises API:

```ts
// sync functions
{fs: FsSynchronousApi, path?: string, separator?: '/' | '\\'}
// async functions
{fs: FsPromisesApi, path?: string, separator?: '/' | '\\'}
```

`path` defaults to `'/'`. Any `fs`-like object works --- `memfs`, the real
`fs`, or an [adapter](/libs/memfs/adapters).

## POJO snapshot

`toSnapshot*` returns a `SnapshotNode` (a nested tuple, see below);
`fromSnapshot*` writes it back into a filesystem.

```ts
const snap = snapshot.toSnapshotSync({ fs, path: '/app' });
snapshot.fromSnapshotSync(snap, { fs: fs2, path: '/restored' });
```

```ts
const snap = await snapshot.toSnapshot({ fs: fs.promises, path: '/app' });
await snapshot.fromSnapshot(snap, { fs: fs2.promises, path: '/restored' });
```

## Binary snapshot (CBOR)

Encoded as a CBOR `Uint8Array` --- compact and binary-safe, good for storing or
sending a whole tree over the wire.

```ts
const bytes = snapshot.toBinarySnapshotSync({ fs, path: '/app' }); // Uint8Array
snapshot.fromBinarySnapshotSync(bytes, { fs: fs2, path: '/app' });
```

```ts
const bytes = await snapshot.toBinarySnapshot({ fs: fs.promises, path: '/app' });
await snapshot.fromBinarySnapshot(bytes, { fs: fs2.promises, path: '/app' });
```

## JSON snapshot

Same idea, JSON-encoded into a `Uint8Array`. Binary file contents are carried as
Base64 data-URL strings, so the result is valid JSON yet still round-trips
binary data.

```ts
const bytes = snapshot.toJsonSnapshotSync({ fs, path: '/app' }); // Uint8Array
snapshot.fromJsonSnapshotSync(bytes, { fs: fs2, path: '/app' });
```

## Function reference

| Format | To snapshot                                 | From snapshot                                   | Returns        |
| ------ | ------------------------------------------- | ----------------------------------------------- | -------------- |
| POJO   | `toSnapshotSync` / `toSnapshot`             | `fromSnapshotSync` / `fromSnapshot`             | `SnapshotNode` |
| CBOR   | `toBinarySnapshotSync` / `toBinarySnapshot` | `fromBinarySnapshotSync` / `fromBinarySnapshot` | `Uint8Array`   |
| JSON   | `toJsonSnapshotSync` / `toJsonSnapshot`     | `fromJsonSnapshotSync` / `fromJsonSnapshot`     | `Uint8Array`   |

The `*Sync` variants take a synchronous `fs`; the others take `fs.promises` and
return a `Promise`.

## Encoding format

A snapshot follows the [Compact JSON](https://jsonjoy.com/specs/compact-json)
scheme: each node is a tuple whose first element is its type.

```ts
const enum SnapshotNodeType {
  Folder = 0,
  File = 1,
  Symlink = 2,
}
```

**Folder** --- type, metadata, and a map of children:

```ts
[
  0,
  {},
  {
    'file.bin': [1, {}, new Uint8Array([1, 2, 3])],
  },
];
```

**File** --- type, metadata, and contents as a `Uint8Array`:

```ts
[1, {}, new Uint8Array([1, 2, 3])];
```

**Symlink** --- type and metadata carrying the link `target`:

```ts
[2, { target: 'file.bin' }];
```

Because the format is structural and stable, a snapshot taken, restored into a
fresh filesystem, and snapshotted again is deep-equal to the original.
