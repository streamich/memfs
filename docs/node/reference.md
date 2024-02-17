# Reference

## `vol` vs `fs`

This package exports `vol` and `fs` objects which both can be used for
filesystem operations but are slightly different.

```js
import { vol, fs } from 'memfs';
```

`vol` is an instance of `Volume` constructor, it is the default volume created
for your convenience. `fs` is an _fs-like_ object created from `vol` using
`createFsFromVolume(vol)`, see reference below.

All contents of the `fs` object are also exported individually, so you can use
`memfs` just like you would use the `fs` module:

```js
import { readFileSync, F_OK, ReadStream } from 'memfs';
```

## `Volume` Constructor

`Volume` is a constructor function for creating new volumes:

```js
import { Volume } from 'memfs';
const vol = new Volume();
```

`Volume` implements all [Node's filesystem methods](https://nodejs.org/api/fs.html):

```js
vol.writeFileSync('/foo', 'bar');
```

But it does not hold constants and its methods are not bound to `vol`:

```js
vol.F_OK; // undefined
```

A new volume can be create using the `Volume.fromJSON` convenience method:

```js
const vol = Volume.fromJSON({
  '/app/index.js': '...',
  '/app/package.json': '...',
});
```

It is just a shorthand for `vol.fromJSON`, see below.

## `Volume` instance `vol`

#### `vol.fromJSON(json[, cwd])`

Adds files from a flat `json` object to the volume `vol`. The `cwd` argument
is optional and is used to compute absolute file paths, if a file path is
given in a relative form.

**Note:** To remove all existing files, use `vol.reset()` method.

```js
vol.fromJSON(
  {
    './index.js': '...',
    './package.json': '...',
    './index.node': new Buffer(),
  },
  '/app',
);
```

#### `vol.mountSync(cwd, json)`

Legacy method, which is just an alias for `vol.fromJSON`.

#### `vol.toJSON([paths[, json[, isRelative]]])`

Exports the whole contents of the volume recursively to a flat JSON object.

`paths` is an optional argument that specifies one or more paths to be exported.
If this argument is omitted, the whole volume is exported. `paths` can be
an array of paths. A path can be a string, `Buffer` or an `URL` object.

`json` is an optional object parameter which will be populated with the exported files.

`isRelative` is boolean that specifies if returned paths should be relative.

#### `vol.reset()`

Removes all files from the volume.

```js
vol.fromJSON({ '/index.js': '...' });
vol.toJSON(); // {'/index.js': '...' }
vol.reset();
vol.toJSON(); // {}
```

#### `vol.toTree()`

Returns a string representation of a volume folder contents as a tree.

```ts
import { memfs } from 'memfs';

const { vol } = memfs({
  '/Users/streamich/src/github/memfs/src': {
    'package.json': '...',
    'tsconfig.json': '...',
    'index.ts': '...',
    util: {
      'index.ts': '...',
      print: {
        'index.ts': '...',
        'printTree.ts': '...',
      },
    },
  },
});

console.log(vol.toTree());

// Output:
// /
// └─ Users/
//    └─ streamich/
//       └─ src/
//          └─ github/
//             └─ memfs/
//                └─ src/
//                   ├─ index.ts
//                   ├─ package.json
//                   ├─ tsconfig.json
//                   └─ util/
//                      ├─ index.ts
//                      └─ print/
//                         ├─ index.ts
//                         └─ printTree.ts
```

The `.toTree()` method accepts options object, where one can specify a sub-folder,
depth of the printed tree, and a separator.

## `createFsFromVolume(vol)`

Returns an _fs-like_ object created from a `Volume` instance `vol`.

```js
import { createFsFromVolume, Volume } from 'memfs';

const vol = new Volume();
const fs = createFsFromVolume(vol);
```

The idea behind the _fs-like_ object is to make it identical to the one
you get from `require('fs')`. Here are some things this function does:

- Binds all methods, so you can do:

```js
const { createFileSync, readFileSync } = fs;
```

- Adds constants `fs.constants`, `fs.F_OK`, etc.
