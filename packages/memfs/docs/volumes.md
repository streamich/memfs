A `Volume` is one isolated in-memory filesystem. You can spin up as many as you
like, seed them from a plain JSON object, and export their contents back to
JSON --- which makes `memfs` convenient for fixtures and assertions.

```ts
import { Volume } from 'memfs';

const vol = Volume.fromJSON({ '/foo': 'bar' });
vol.readFileSync('/foo', 'utf8'); // 'bar'
```

## Building from JSON

There are two JSON shapes. **Flat** maps full paths to contents:

```ts
type DirectoryJSON = { [path: string]: string | Buffer | null };
```

```ts
const vol = Volume.fromJSON(
  {
    './README.md': '1',
    './src/index.js': '2',
    './node_modules/debug/index.js': '3',
  },
  '/app', // cwd: resolves the relative keys above
);

vol.readFileSync('/app/README.md', 'utf8'); // '1'
vol.readFileSync('/app/src/index.js', 'utf8'); // '2'
```

**Nested** lets directories nest as objects --- handy for deeper trees:

```ts
const vol = Volume.fromNestedJSON({
  '/app': {
    'index.js': '...',
    src: {
      'main.ts': '...',
      util: { 'log.ts': '...' },
    },
  },
});
```

In both shapes the value `null` means an **empty directory** and an empty
string `''` means an **empty file**. Values can be `string` or `Buffer`
(binary). The instance methods `vol.fromJSON(json, cwd?)` and
`vol.fromNestedJSON(json, cwd?)` add files into an existing volume; the static
`Volume.fromJSON` / `Volume.fromNestedJSON` create a new one.

```ts
const vol = new Volume();
vol.fromJSON({ '/a.txt': 'A' });
vol.fromJSON({ '/b.txt': 'B' }); // merges in
```

```jj.note
`vol.mountSync(mountpoint, json)` is a legacy alias for adding a flat JSON tree
rooted at a given path. New code should use `fromJSON` with a cwd.
```

## Exporting to JSON

`toJSON` walks the volume and returns a flat object --- the inverse of
`fromJSON`. This is the workhorse for test assertions:

```ts
vol.writeFileSync('/foo', 'bar');
vol.toJSON(); // {'/foo': 'bar'}
```

```ts
expect(vol.toJSON()).toEqual({ '/foo': 'bar' });
```

The full signature lets you scope and shape the output:

```ts
vol.toJSON(
  paths?: PathLike | PathLike[], // restrict to these paths; omit for everything
  json?: {},                     // object to populate (for merging exports)
  isRelative?: boolean,          // emit relative instead of absolute paths
  asBuffer?: boolean,            // emit Buffer contents instead of strings
): DirectoryJSON;
```

```ts
const vol = Volume.fromJSON({ '/dir/a': 'b', '/dir2/a': 'b', '/dir2/c': 'd' });
vol.toJSON('/dir2'); // {'/dir2/a': 'b', '/dir2/c': 'd'}
```

## Reset

`reset()` empties a volume so you can reuse it between tests:

```ts
vol.fromJSON({ '/index.js': '...' });
vol.toJSON(); // {'/index.js': '...'}
vol.reset();
vol.toJSON(); // {}
```

## Inspecting as a tree

`toTree()` renders the volume as an ASCII tree (a quick built-in; for arbitrary
`fs` filesystems and more options see [Tree printing](/libs/memfs/tree-printing)):

```ts
const { vol } = memfs({
  '/src': {
    'index.ts': '...',
    util: { 'print.ts': '...' },
  },
});

console.log(vol.toTree());
// /
// └─ src/
//    ├─ index.ts
//    └─ util/
//       └─ print.ts
```

`toTree(opts?)` accepts a sub-folder, a `depth`, and a `separator`.

## Many volumes

Each `Volume` is fully independent:

```ts
const a = Volume.fromJSON({ '/foo': 'bar' });
const b = Volume.fromJSON({ '/foo': 'baz' });

a.readFileSync('/foo', 'utf8'); // 'bar'
b.readFileSync('/foo', 'utf8'); // 'baz'
```

Reach for `memfs()` when you also want the bound, `constants`-carrying `fs`
object alongside the volume --- see the [Node fs API](/libs/memfs/node-fs-api)
page.

## Combine with the real disk: `unionfs`

[`unionfs`](https://github.com/streamich/unionfs) layers several filesystems
into one. Overlay an in-memory volume on top of the real disk:

```ts
import * as realFs from 'fs';
import { ufs } from 'unionfs';
import { Volume } from 'memfs';

const vol = Volume.fromJSON({ '/foo': 'bar' });

ufs.use(realFs).use(vol);
ufs.readFileSync('/foo', 'utf8'); // 'bar', served from the volume
```

## Patch `require`: `fs-monkey`

[`fs-monkey`](https://github.com/streamich/fs-monkey) can point Node's module
loader at a volume, so `require()` resolves modules out of memory:

```ts
import { patchRequire } from 'fs-monkey';

vol.writeFileSync('/index.js', 'console.log("hi world")');
patchRequire(vol);
require('/index'); // logs: hi world
```

`fs-monkey` also exposes `patchFs(vol)` to monkey-patch the global `fs` module
itself.
