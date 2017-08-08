# memfs

In-memory file-system with Node's `fs` API.

[See example in browser.](https://jsfiddle.net/6a96vLoj/2/)

A [`fs`](https://nodejs.org/api/fs.html) API to work with *virtual in-memory* files.

```javascript
var memfs = require('memfs');

var mem = new memfs.Volume;
mem.mountSync('./', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');"
});

console.log(mem.readFileSync('./dir/hello.js').toString());
```

Use it together with [`unionfs`](http://www.npmjs.com/package/unionfs):

```javascript
var unionfs = require('unionfs');
var fs = require('fs');

// Create a union of two file systems:
unionfs
    .use(fs)
    .use(mem);
    
// Now `unionfs` has the `fs` API but on both file systems.
console.log(unionfs.readFileSync('./test.js').toString()); // console.log(123);
    
// Replace `fs` with the union of those file systems.
unionfs.replace(fs);

// Now you can do this.
console.log(fs.readFileSync('./test.js').toString()); // console.log(123);

// ... and this:
require('./test.js'); // 123

```

This package assumes you are running on Node or have a
[`path`](https://www.npmjs.com/package/path) and `buffer` modules available.

It also uses `process` and `setImmediate` globals, but mocks them, if not
available.

## API Status

 - [x] Constants
 - [ ] `FSWatcher`
 - [ ] `ReadStream`
 - [ ] `WriteStream`
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
 - [ ] `createReadStream(path[, options])`
 - [ ] `createWriteStream(path[, options])`
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
 - [ ] `read(fd, buffer, offset, length, position, callback)`
 - [ ] `readSync(fd, buffer, offset, length, position)`
 - [x] `readdir(path[, options], callback)`
 - [x] `readdirSync(path[, options])`
 - [x] `readFile(path[, options], callback)`
 - [x] `readFileSync(path[, options])`
 - [x] `readlink(path[, options], callback)`
 - [x] `readlinkSync(path[, options])`
 - [x] `realpath(path[, options], callback)`
 - [x] `realpathSync(path[, options])`
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
 - [ ] `watch(filename[, options][, listener])`
 - [x] `watchFile(filename[, options], listener)`
 - [x] `unwatchFile(filename[, listener])`
 - [x] `write(fd, buffer[, offset[, length[, position]]], callback)`
 - [x] `write(fd, string[, position[, encoding]], callback)`
 - [x] `writeFile(file, data[, options], callback)`
 - [x] `writeFileSync(file, data[, options])`
 - [x] `writeSync(fd, buffer[, offset[, length[, position]]])`
 - [x] `writeSync(fd, string[, position[, encoding]])`

## Contributing

TODOs:


Testing:

    npm test
    npm run test-watch

Building:

    npm run build
