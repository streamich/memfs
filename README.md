# memfs 2.0

[![][npm-badge]][npm-url] [![][travis-badge]][travis-url]

In-memory file-system with [Node's `fs` API](https://nodejs.org/api/fs.html).

 - 100% of Node's `fs` API implemented, see *API Status*
 - Stores files in memory, in `Buffer`s
 - Throws same* errors as Node.js
 - Has concept of *i-nodes*
 - Implements *hard links*
 - Implements *soft links* (aka symlinks, symbolic links)
 - More testing coming soon*
 - Permissions may* be implemented in the future
 - Can be used in browser, see [`memfs-webpack`](https://github.com/streamich/memfs-webpack)

Install:

    npm install --save memfs

Usage:

```js
import {fs} from 'memfs';

fs.writeFileSync('/hello.txt', 'World!');
fs.readFileSync('/hello.txt', 'utf8'); // World!
```

Create a file system from a plain JSON:

```js
import {fs, vol} from 'memfs';

const json = {
    './README.md': '1',
    './src/index.js': '2',
    './node_modules/debug/index.js': '3',
};
vol.fromJSON(json, '/app');

fs.readFileSync('/app/README.md', 'utf8'); // 1
vol.readFileSync('/app/src/index.js', 'utf8'); // 2
```

Export to JSON:

```js
vol.writeFileSync('/script.sh', '#! /bin/bash');
vol.toJSON(); // {"/script.sh": "#! /bin/bash"}
```

Use it for testing:

```js
vol.writeFileSync('/foo', 'bar');
expect(vol.toJSON()).to.eql({"/foo": "bar"});
```

#### See also

Other filesystem goodies:

 - [`spyfs`][spyfs] - spies on filesystem actions
 - [`unionfs`][unionfs] - creates a union of multiple filesystem volumes
 - [`linkfs`][linkfs] - redirects filesystem paths
 - [`fs-monkey`][fs-monkey] - monkey-patches Node's `fs` module and `require` function
 - [`libfs`](https://github.com/streamich/full-js/blob/master/src/lib/fs.ts) - real filesystem (that executes UNIX system calls) implemented in JavaScript

Create as many filesystem volumes as you need:

```js
import {Volume} from 'memfs';

const vol = Volume.fromJSON({'/foo': 'bar'});
vol.readFileSync('/foo'); // bar

const vol2 = Volume.fromJSON({'/foo': 'bar 2'});
vol2.readFileSync('/foo'); // bar 2
```

Use `memfs` together with [`unionfs`][unionfs] to create one filesystem
from your in-memory volumes and the real disk filesystem:

```js
import * as fs from 'fs';
import {ufs} from 'unionfs';

ufs
    .use(fs)
    .use(vol);

ufs.readFileSync('/foo'); // bar
```

Use [`fs-monkey`][fs-monkey] to monkey-patch Node's `require` function:

```js
import {patchRequire} from 'fs-monkey';

vol.writeFileSync('/index.js', 'console.log("hi world")');
patchRequire(vol);
require('/index'); // hi world
```

## Dependencies

This package depends on the following Node modules: `buffer`, `events`,
`streams`, `path`.

It also uses `process` and `setImmediate` globals, but mocks them, if not
available.

## Reference

#### `vol` vs `fs`

This package exports `vol` and `fs` objects which both can be used for
filesystem operations but are slightly different.

```js
import {vol, fs} from 'memfs';
```

`vol` is an instance of `Volume` constructor, it is the default volume created
for your convenience. `fs` is an *fs-like* object created from `vol` using
`createFsFromVolume(vol)`, see reference below.

All contents of the `fs` object are also exported individually, so you can use
`memfs` just like you would use the `fs` module:

```js
import {readFileSync, F_OK, ReadStream} from 'memfs';
```

#### `Volume` Constructor

`Volume` is a constructor function for creating new volumes:

```js
import {Volume} from 'memfs';
const vol = new Volume;
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

#### `Volume` instance `vol`

###### `vol.fromJSON(json[, cwd])`

Adds files from a flat `json` object to the volume `vol`. The `cwd` argument
is optional and is used to compute absolute file paths, if a file path is
given in a relative form.

**Note:** To remove all existing files, use `vol.reset()` method.

```js
vol.fromJSON({
    './index.js': '...',
    './package.json': '...',
}, '/app');
```

###### `vol.mountSync(cwd, json)`

Legacy method, which is just an alias for `vol.fromJSON`.

###### `vol.toJSON([paths[, json[, isRelative]]])`

Exports the whole contents of the volume recursively to a flat JSON object.

`paths` is an optional argument that specifies one or more paths to be exported.
If this argument is omitted, the whole volume is exported. `paths` can be
an array of paths. A path can be a string, `Buffer` or an `URL` object.

`json` is an optional object parameter which will be populated with the exported files.

`isRelative` is boolean that specifies if returned paths should be relative.

**Note:** JSON contains only files, empty folders will be absent.

###### `vol.reset()`

Removes all files from the volume.

```js
vol.fromJSON({'/index.js': '...'});
vol.toJSON(); // {'/index.js': '...' }
vol.reset();
vol.toJSON(); // {}
```

###### `vol.mkdirp(path, callback)`

Creates a directory tree recursively. `path` specifies a directory to
create and can be a string, `Buffer`, or an `URL` object. `callback` is
called on completion and may receive only one argument - an `Error` object.

###### `vol.mkdirpSync(path)`

A synchronous version of `vol.mkdirp()`. This method throws.

#### `createFsFromVolume(vol)`

Returns an *fs-like* object created from a `Volume` instance `vol`.

```js
import {createFsFromVolume, Volume} from 'memfs';

const vol = new Volume;
const fs = createFsFromVolume(vol);
```

The idea behind the *fs-like* object is to make it identical to the one
you get from `require('fs')`. Here are some things this function does:

  - Binds all methods, so you can do:

  ```js
  const {createFileSync, readFileSync} = fs;
  ```

  - Adds constants `fs.constants`, `fs.F_OK`, etc.

# Relative paths

If you work with *absolute* paths, you should get what you expect from `memfs`.

You can also use *relative* paths but the gotcha is that then `memfs` needs
to somehow resolve those relative paths to absolute paths. `memfs` will use
the value of `process.cwd()` to resolve the absolute paths. The problem is
that `process.cwd()` specifies the *current working directory* of your
on-disk filesystem and you will probably not have that directory available in
`memfs`.

The best solution is to always use absolute paths. Alternatively, you can use
`mkdirp` method to recursively create the current working directory in your
volume:

```js
vol.mkdirpSync(process.cwd());
```

Or, you can set the current working directory to `/`, which
is one folder that exists in all your `memfs` volumes:

```js
process.chdir('/');
```


# API Status

All of the [Node's `fs` API](https://nodejs.org/api/fs.html) is implemented.
Some error messages may be inaccurate. File permissions are currently not
implemented (you have access to any file), basically `fs.access()` is a no-op.

  - [x] Constants
  - [x] `FSWatcher`
  - [x] `ReadStream`
  - [x] `WriteStream`
  - [x] `Stats`
  - [x] `access(path[, mode], callback)`
    - Does not check permissions
  - [x] `accessSync(path[, mode])`
    - Does not check permissions
  - [x] `appendFile(file, data[, options], callback)`
  - [x] `appendFileSync(file, data[, options])`
  - [x] `chmod(path, mode, callback)`
  - [x] `chmodSync(path, mode)`
  - [x] `chown(path, uid, gid, callback)`
  - [x] `chownSync(path, uid, gid)`
  - [x] `close(fd, callback)`
  - [x] `closeSync(fd)`
  - [x] `createReadStream(path[, options])`
  - [x] `createWriteStream(path[, options])`
  - [x] `exists(path, callback)`
  - [x] `existsSync(path)`
  - [x] `fchmod(fd, mode, callback)`
  - [x] `fchmodSync(fd, mode)`
  - [x] `fchown(fd, uid, gid, callback)`
  - [x] `fchownSync(fd, uid, gid)`
  - [x] `fdatasync(fd, callback)`
  - [x] `fdatasyncSync(fd)`
  - [x] `fstat(fd, callback)`
  - [x] `fstatSync(fd)`
  - [x] `fsync(fd, callback)`
  - [x] `fsyncSync(fd)`
  - [x] `ftruncate(fd[, len], callback)`
  - [x] `ftruncateSync(fd[, len])`
  - [x] `futimes(fd, atime, mtime, callback)`
  - [x] `futimesSync(fd, atime, mtime)`
  - [x] `lchmod(path, mode, callback)`
  - [x] `lchmodSync(path, mode)`
  - [x] `lchown(path, uid, gid, callback)`
  - [x] `lchownSync(path, uid, gid)`
  - [x] `link(existingPath, newPath, callback)`
  - [x] `linkSync(existingPath, newPath)`
  - [x] `lstat(path, callback)`
  - [x] `lstatSync(path)`
  - [x] `mkdir(path[, mode], callback)`
  - [x] `mkdirSync(path[, mode])`
  - [x] `mkdtemp(prefix[, options], callback)`
  - [x] `mkdtempSync(prefix[, options])`
  - [x] `open(path, flags[, mode], callback)`
  - [x] `openSync(path, flags[, mode])`
  - [x] `read(fd, buffer, offset, length, position, callback)`
  - [x] `readSync(fd, buffer, offset, length, position)`
  - [x] `readdir(path[, options], callback)`
  - [x] `readdirSync(path[, options])`
  - [x] `readFile(path[, options], callback)`
  - [x] `readFileSync(path[, options])`
  - [x] `readlink(path[, options], callback)`
  - [x] `readlinkSync(path[, options])`
  - [x] `realpath(path[, options], callback)`
  - [x] `realpathSync(path[, options])`
    - Caching not implemented
  - [x] `rename(oldPath, newPath, callback)`
  - [x] `renameSync(oldPath, newPath)`
  - [x] `rmdir(path, callback)`
  - [x] `rmdirSync(path)`
  - [x] `stat(path, callback)`
  - [x] `statSync(path)`
  - [x] `symlink(target, path[, type], callback)`
  - [x] `symlinkSync(target, path[, type])`
  - [x] `truncate(path[, len], callback)`
  - [x] `truncateSync(path[, len])`
  - [x] `unlink(path, callback)`
  - [x] `unlinkSync(path)`
  - [x] `utimes(path, atime, mtime, callback)`
  - [x] `utimesSync(path, atime, mtime)`
  - [x] `watch(filename[, options][, listener])`
  - [x] `watchFile(filename[, options], listener)`
  - [x] `unwatchFile(filename[, listener])`
  - [x] `write(fd, buffer[, offset[, length[, position]]], callback)`
  - [x] `write(fd, string[, position[, encoding]], callback)`
  - [x] `writeFile(file, data[, options], callback)`
  - [x] `writeFileSync(file, data[, options])`
  - [x] `writeSync(fd, buffer[, offset[, length[, position]]])`
  - [x] `writeSync(fd, string[, position[, encoding]])`


[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg
[travis-url]: https://travis-ci.org/streamich/memfs
[travis-badge]: https://travis-ci.org/streamich/memfs.svg?branch=master
[memfs]: https://github.com/streamich/memfs
[unionfs]: https://github.com/streamich/unionfs
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs
[fs-monkey]: https://github.com/streamich/fs-monkey





# License

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>
