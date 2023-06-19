# memfs

[![][chat-badge]][chat] [![][npm-badge]][npm-url]

[chat]: https://onp4.com/@vadim/~memfs
[chat-badge]: https://img.shields.io/badge/Chat-%F0%9F%92%AC-green?style=flat&logo=chat&link=https://onp4.com/@vadim/~memfs
[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg

JavaScript file system utilities for Node.js and browser.


## Install

```shell
npm install --save memfs
```

## Docs

- Node.js `fs` API
  - [In-memory file system](./docs/node/index.md)
- File System Access ([FSA](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)) API (the browser file system API)
  - [`fs` to FSA adapter](./docs/fsa/fs-to-fsa.md)
  - [FSA to `fs` adapter](./docs/fsa/fsa-to-fs.md)


## Demo

https://github.com/streamich/memfs/assets/9773803/8dc61d1e-61bf-4dfc-973b-028332fd4473

Above demo uses the File System Access API in the browser to get access to a real folder
on the file system. It then converts a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) instance
to a Node-like `fs` file system. It then uses the `fs` API to create a couple
of files and then read them and zip into a tarball, which is written to the file system
using the `fs` WriteStream API.


## License

Apache 2.0
