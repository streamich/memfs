`memfs` implements [Node's `fs` API](https://nodejs.org/api/fs.html) in memory:
synchronous, callback, and promise-based methods; read/write streams; file and
directory watching; hard links and symlinks; i-nodes; file descriptors; and the
`fs.constants`. It throws same errors as Node (with `.code` set, e.g.
`ENOENT`), so code that branches on error codes keeps working.

```ts
import { fs } from 'memfs';

fs.writeFileSync('/hello.txt', 'World!');
fs.readFileSync('/hello.txt', 'utf8'); // 'World!'
```

## `memfs()` --- isolated instances

`fs`/`vol` are a single shared default volume. For tests, prefer `memfs()`,
which returns a brand-new, isolated pair so volumes never leak into each other:

```ts
import { memfs } from 'memfs';

const { fs, vol } = memfs();
```

Seed it from a [nested JSON tree](/libs/memfs/volumes):

```ts
const { fs } = memfs({
  '/app': {
    'index.js': 'console.log(1)',
    'package.json': '{"name": "app"}',
  },
});

fs.readdirSync('/app'); // ['index.js', 'package.json']
```

The second argument is a cwd string or an options object:

```ts
interface MemfsOptions {
  /** Working directory for resolving relative paths. Defaults to '/'. */
  cwd?: string;
  /** A process-like object controlling platform, uid, gid, and cwd(). */
  process?: IProcess;
}

memfs(json?: NestedDirectoryJSON, cwdOrOpts?: string | MemfsOptions): {fs: IFs; vol: Volume};
```

```ts
const { fs } = memfs({ './README.md': '# Hi' }, '/repo');
fs.readFileSync('/repo/README.md', 'utf8'); // '# Hi'
```

## `fs` vs `vol`

The package exports both `fs` and `vol`. They back onto the **same storage** but
differ in shape:

```ts
import { fs, vol } from 'memfs';
```

- **`vol`** is a `Volume` instance --- it implements every `fs` method, plus
  volume helpers like `fromJSON`/`toJSON`/`reset`/`toTree`. Its methods are
  _not_ bound and it carries no `constants`:

  ```ts
  vol.writeFileSync('/foo', 'bar');
  vol.F_OK; // undefined
  ```

- **`fs`** is an _fs-like_ object built from `vol` with `createFsFromVolume(vol)`.
  All methods are **bound** (safe to destructure) and
  it carries `constants`, `Stats`, `Dirent`, `ReadStream`, `promises`, etc. ---
  identical in shape to `require('fs')`:

  ```ts
  const { readFileSync, writeFileSync } = fs; // bound, safe to destructure
  fs.constants.O_RDONLY; // 0
  ```

Every member of the `fs` object is also re-exported at the top level, so you can
treat `memfs` itself as the `fs` module:

```ts
import { readFileSync, F_OK, ReadStream } from 'memfs';
```

Use `vol` when you want the volume helpers; use `fs` (or `memfs()`) when you want
a faithful `fs` drop-in.

## `Volume` and `createFsFromVolume`

`memfs()` is sugar over two lower-level pieces you can use directly:

```ts
import { Volume, createFsFromVolume } from 'memfs';

const vol = new Volume();
const fs = createFsFromVolume(vol);

fs.writeFileSync('/foo', 'bar');
```

`new Volume()` is an empty filesystem. `createFsFromVolume(vol)` wraps it into
the bound, `constants`-carrying `fs`-like object described above. Construct as
many independent volumes as you need --- see [Volumes](/libs/memfs/volumes).

## The promises API

`fs.promises` (equivalently `vol.promises`) mirrors `fs/promises`:

```ts
const { fs } = memfs();

await fs.promises.writeFile('/note.txt', 'hi');
await fs.promises.readFile('/note.txt', 'utf8'); // 'hi'

const handle = await fs.promises.open('/note.txt', 'r');
const { bytesRead, buffer } = await handle.read(Buffer.alloc(2), 0, 2, 0);
await handle.close();
```

## Streams

`createReadStream` and `createWriteStream` return Node-compatible streams:

```ts
const { fs } = memfs({ '/in.txt': 'stream me' });

const out = fs.createWriteStream('/out.txt');
fs.createReadStream('/in.txt').pipe(out);
out.on('finish', () => fs.readFileSync('/out.txt', 'utf8')); // 'stream me'
```

## Watching

Both `fs.watch` (inode events) and `fs.watchFile` (stat polling) are
implemented:

```ts
const { fs } = memfs({ '/log.txt': '' });

const watcher = fs.watch('/log.txt', (eventType, filename) => {
  // eventType: 'change' | 'rename'
});

fs.appendFileSync('/log.txt', 'entry\n');
watcher.close();
```

## Supporting objects

These are available both as named exports and as properties of the `fs` object.

| Object        | Description                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Stats`       | Result of `stat`/`lstat`/`fstat`. `Stats<bigint>` when `{bigint: true}`                                                                                                                                            |
| `Dirent`      | Directory entry from `readdir({withFileTypes: true})` and `Dir`. Exposes `name`, `parentPath`, and `isFile()`/`isDirectory()`/`isSymbolicLink()`/... (the legacy `path` getter is deprecated --- use `parentPath`) |
| `Dir`         | Async directory iterator from `opendir`. Implements `AsyncIterable<Dirent>` and `Symbol.asyncDispose`, so it works with `await using`                                                                              |
| `StatFs`      | Result of `statfs`/`statfsSync`                                                                                                                                                                                    |
| `FileHandle`  | Returned by `fs.promises.open()`                                                                                                                                                                                   |
| `StatWatcher` | Returned by `watchFile`                                                                                                                                                                                            |
| `FSWatcher`   | Returned by `watch`                                                                                                                                                                                                |

`Dir` with `await using` (auto-closes on scope exit):

```ts
const { fs } = memfs({ '/d': { a: '', b: '' } });

await using dir = await fs.promises.opendir('/d');
for await (const entry of dir) {
  entry.name; // 'a' then 'b'
  entry.parentPath; // '/d'
  entry.isFile(); // true
}
```

## Relative paths

Absolute paths behave as you would expect. **Relative** paths are resolved
against `process.cwd()` --- which points at your _on-disk_ working directory,
a folder that almost certainly does not exist inside the in-memory volume. The
safe choice is to always use absolute paths.

If you must use relative paths, either create the cwd inside the volume:

```ts
vol.mkdirSync(process.cwd(), { recursive: true });
```

or point the process at `/`, which exists in every volume:

```ts
process.chdir('/');
```

(You can also pass a `cwd` to [`memfs()`](/libs/memfs/node-fs-api) or a custom
`process` object to control this per volume.)

## Dependencies

The Node `fs` implementation relies on the `buffer`, `events`, `stream`, and
`path` built-ins, and uses the `process` and `setImmediate` globals (mocking
them when unavailable), so it bundles cleanly for the browser.
