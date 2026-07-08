# memfs

[![][npm-badge]][npm-url]

[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg

JavaScript file system utilities for Node.js and browser. Implementation of in-memory [Node.js `fs` module API](https://nodejs.org/api/fs.html) and in-memory [browser File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), as well as adapters from `fs` module to File Sytem API and from File Sytem API to `fs` module.

## Install

```shell
npm i memfs
```

## Resources

- [In-memory Node.js `fs` API](./docs/node/index.md)
- [In-memory browser File System (Access) API](./docs/fsa/fsa.md)
- [`fs` to File System (Access) API adapter](./docs/fsa/fs-to-fsa.md)
- [File System (Access) API to `fs` adapter](./docs/fsa/fsa-to-fs.md)
- [Directory `snapshot` utility](./docs/snapshot/index.md)
- [`print` directory tree to terminal](./docs/print/index.md)
- [Code reference](https://streamich.github.io/memfs/)
- [Test coverage](https://streamich.github.io/memfs/coverage/lcov-report/)

## Watching

All file-watching APIs are implemented on both sides of the `fs` adn File System API divide:

| Feature                                                                    | Package                                                  | Notes                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `fs.watch` — `recursive`, `encoding`, `signal`, `throwIfNoEntry`, `ignore` | [`@jsonjoy.com/fs-node`](packages/fs-node)               | `'error'`/`'close'` events, `ref()`/`unref()`                                           |
| `fs.watchFile` / `fs.unwatchFile`                                          | [`@jsonjoy.com/fs-node`](packages/fs-node)               | polling, `bigint`, Node's reappearance semantics                                        |
| `fs.promises.watch` async iterator                                         | [`@jsonjoy.com/fs-node`](packages/fs-node)               | `maxQueue`, `overflow`, `AbortError` on abort                                           |
| [`FileSystemObserver`][observer]                                           | [`@jsonjoy.com/fs-fsa`](packages/fs-fsa)                 | deterministic OPFS profile: precise records, real `"moved"` records, microtask batching |
| `fs.watch`/`fs.watchFile` over a real FSA directory                        | [`@jsonjoy.com/fs-fsa-to-node`](packages/fs-fsa-to-node) | works over OPFS in Chrome 133+ via the native observer                                  |
| `FileSystemObserver` over any `fs`                                         | [`@jsonjoy.com/fs-node-to-fsa`](packages/fs-node-to-fsa) | best-effort profile: renames stat-classified, no `"moved"` records                      |

Intentional divergences from real watchers (the in-memory backend is deterministic, so platform
unreliability is not emulated):

- Paths are watched semantically rather than by inode: after delete-and-recreate, memfs reports
  events for the recreated entry, while a real POSIX watcher keeps watching the dead inode.
- Exactly one event per logical operation — no platform duplicate events.
- `filename` is never `null`.
- The Node-style `FSWatcher` delivers events synchronously inside the mutating operation, whereas
  real Node defers to the event loop; the `FileSystemObserver` batches per microtask, as the spec
  requires.

[observer]: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver

## Demos

- [Git in browser, which writes to a real folder](demo/git-fsa/README.md)
- [Git in browser, which writes to OPFS file system](demo/git-opfs/README.md)
- [Git on in-memory file system](demo/git/README.md)
- [`fs` in browser, creates a `.tar` file in real folder](demo/fsa-to-node-zipfile/README.md)
- [`fs` in browser, synchronous API, writes to real folder](demo/fsa-to-node-sync-tests/README.md)

## See also

- [`unionfs`][unionfs] - creates a union of multiple filesystem volumes
- [`fs-monkey`][fs-monkey] - monkey-patches Node's `fs` module and `require` function
- [`linkfs`][linkfs] - redirects filesystem paths
- [`spyfs`][spyfs] - spies on filesystem actions

[unionfs]: https://github.com/streamich/unionfs
[fs-monkey]: https://github.com/streamich/fs-monkey
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs

## License

Apache 2.0
