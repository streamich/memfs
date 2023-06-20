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

- Node.js `fs` API
  - [In-memory `fs` API](./docs/node/index.md)
- File System Access (FSA) API &mdash; the browser file system
  - [`fs` to FSA adapter](./docs/fsa/fs-to-fsa.md)
  - [FSA to `fs` adapter](./docs/fsa/fsa-to-fs.md)


## Demos

- [Git in browser, which writes to a real folder](demo/git-fsa/README.md)
- [Git in browser, which writes to OPFS file system](demo/git-opfs/README.md)
- [Git on in-memory file system](demo/git/README.md)
- [`fs` in browser, creates a `.tar` file in real folder](demo/fsa-to-node-zipfile/README.md)
- [`fs` in browser, synchronous API, writes to real folder](demo/fsa-to-node-sync-tests/README.md)


## License

Apache 2.0
