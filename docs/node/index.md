# Node `fs` API in-memory implementation

In-memory file-system with [Node's `fs` API](https://nodejs.org/api/fs.html).

- Node's `fs` API implemented, see [_old API Status_](./api-status.md), [missing list](https://github.com/streamich/memfs/issues/735), [missing `opendir`](https://github.com/streamich/memfs/issues/663)
- Stores files in memory, in `Buffer`s
- Throws sameish\* errors as Node.js
- Has concept of _i-nodes_
- Implements _hard links_
- Implements _soft links_ (aka symlinks, symbolic links)
- Permissions may\* be implemented in the future
- Can be used in browser, see [`memfs-webpack`](https://github.com/streamich/memfs-webpack)

## Docs

- [Getting started](./usage.md)
- [Reference](./reference.md)
- [Relative paths](./relative-paths.md)
- [API status](./api-status.md)
- [Dependencies](./dependencies.md)

## See also

- [`spyfs`][spyfs] - spies on filesystem actions
- [`unionfs`][unionfs] - creates a union of multiple filesystem volumes
- [`linkfs`][linkfs] - redirects filesystem paths
- [`fs-monkey`][fs-monkey] - monkey-patches Node's `fs` module and `require` function
- [`libfs`](https://github.com/streamich/full-js/blob/master/src/lib/fs.ts) - real filesystem (that executes UNIX system calls) implemented in JavaScript

[chat]: https://onp4.com/@vadim/~memfs
[chat-badge]: https://img.shields.io/badge/Chat-%F0%9F%92%AC-green?style=flat&logo=chat&link=https://onp4.com/@vadim/~memfs
[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg
[travis-url]: https://travis-ci.org/streamich/memfs
[travis-badge]: https://travis-ci.org/streamich/memfs.svg?branch=master
[memfs]: https://github.com/streamich/memfs
[unionfs]: https://github.com/streamich/unionfs
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs
[fs-monkey]: https://github.com/streamich/fs-monkey
