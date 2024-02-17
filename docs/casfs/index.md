# `casfs`

`casfs` is a Content Addressable Storage (CAS) abstraction over a file system.
It has no folders nor files. Instead, it has _blobs_ which are identified by their content.

Essentially, it provides two main operations: `put` and `get`. The `put` operation
takes a blob and stores it in the underlying file system and returns the blob's hash digest.
The `get` operation takes a hash and returns the blob, which matches the hash digest, if it exists.

## Usage

### `casfs` on top of Node.js `fs` module

`casfs` builds on top of [`crudfs`](../crudfs//index.md), and `crudfs`&mdash;in turn&mdash;builds on top of
[File System Access API](../fsa/fs-to-fsa.md).

```js
import * as fs from 'fs';
import { nodeToFsa } from 'memfs/lib/node-to-fsa';
import { FsaCrud } from 'memfs/lib/fsa-to-crud';

const fsa = nodeToFsa(fs, '/path/to/folder', { mode: 'readwrite' });
const crud = new FsaCrud(fsa);
const cas = new CrudCas(crud, { hash });
```

The `hash` is a function which computes a hash digest `string` from a `Uint8Array` blob.
Here is how one could look like:

```ts
import { createHash } from 'crypto';

const hash = async (blob: Uint8Array): Promise<string> => {
  const shasum = createHash('sha1');
  shasum.update(blob);
  return shasum.digest('hex');
};
```

Now that you have a `cas` instance, you can use it to `put` and `get` blobs.

```js
const blob = new Uint8Array([1, 2, 3]);

const hash = await cas.put(blob);
console.log(hash); // 9dc58b6d4e8eefb5a3c3e0c9f4a1a0b1b2b3b4b5

const blob2 = await cas.get(hash);
```

You can also delete blobs:

```js
await cas.del(hash);
```

And retrieve information about blobs:

```js
const info = await cas.info(hash);
```
