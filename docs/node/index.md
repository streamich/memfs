# Node `fs` API in-memory implementation

In-memory file-system with [Node's `fs` API](https://nodejs.org/api/fs.html).

- Node's `fs` API implemented, see [missing list](https://github.com/streamich/memfs/issues/735)
- Stores files in memory, in `Buffer`s
- Throws sameish\* errors as Node.js
- Has concept of _i-nodes_
- Implements _hard links_
- Implements _soft links_ (aka symlinks, symbolic links)
- Can be used in browser, see `/demo` folder

## Docs

- [Getting started](./usage.md)
- [Reference](./reference.md)
- [Relative paths](./relative-paths.md)
- [Dependencies](./dependencies.md)

[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg
[travis-url]: https://travis-ci.org/streamich/memfs
[travis-badge]: https://travis-ci.org/streamich/memfs.svg?branch=master
[memfs]: https://github.com/streamich/memfs
[unionfs]: https://github.com/streamich/unionfs
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs
[fs-monkey]: https://github.com/streamich/fs-monkey
