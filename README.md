# memfs

[![][chat-badge]][chat] [![][npm-badge]][npm-url]

[chat]: https://onp4.com/@vadim/~memfs
[chat-badge]: https://img.shields.io/badge/Chat-%F0%9F%92%AC-green?style=flat&logo=chat&link=https://onp4.com/@vadim/~memfs
[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg

JavaScript file system utilities for Node.js and browser.


## Install

```shell
npm i memfs
```


## Docs

- [In-memory Node.js `fs` API](./docs/node/index.md)
- [`fs` to File System Access API adapter](./docs/fsa/fs-to-fsa.md)
- [File System Access to `fs` adapter](./docs/fsa/fsa-to-fs.md)


## Demos

- [Git in browser, which writes to a real folder](demo/git-fsa/README.md)
- [Git in browser, which writes to OPFS file system](demo/git-opfs/README.md)
- [Git on in-memory file system](demo/git/README.md)
- [`fs` in browser, creates a `.tar` file in real folder](demo/fsa-to-node-zipfile/README.md)
- [`fs` in browser, synchronous API, writes to real folder](demo/fsa-to-node-sync-tests/README.md)


## See also

- [`spyfs`][spyfs] - spies on filesystem actions
- [`unionfs`][unionfs] - creates a union of multiple filesystem volumes
- [`linkfs`][linkfs] - redirects filesystem paths
- [`fs-monkey`][fs-monkey] - monkey-patches Node's `fs` module and `require` function
- [`libfs`](https://github.com/streamich/full-js/blob/master/src/lib/fs.ts) - real filesystem (that executes UNIX system calls) implemented in JavaScript

[memfs]: https://github.com/streamich/memfs
[unionfs]: https://github.com/streamich/unionfs
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs
[fs-monkey]: https://github.com/streamich/fs-monkey


## License

Apache 2.0
