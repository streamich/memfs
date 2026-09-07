# Errors

Errors thrown by the `fs` API carry the same own properties as Node's, in the
same order, so code that inspects `err.code`, `err.errno`, `err.syscall`,
`err.path` or `err.dest` sees the same shape.

```js
try {
  fs.renameSync('/a', '/b');
} catch (err) {
  err.message; // "ENOENT: no such file or directory, rename '/a' -> '/b'"
  err.errno; // -2
  err.code; // 'ENOENT'
  err.syscall; // 'rename'
  err.path; // '/a'
  err.dest; // '/b'
}
```

- `errno` is the Linux value, negated as libuv does, on every platform. Node
  reports the host's value, which differs on macOS and Windows for codes such
  as `ELOOP`, `ENOTEMPTY` and `ENOSYS`.
- `syscall` is the libuv request name, not the JS method: `readdir` reports
  `scandir`, `copyFile` reports `copyfile`, `utimes` reports `utime`.
- `path` is set when the call had a path, `dest` only for `rename`, `link`,
  `symlink`, `copyFile` and `cp`.
- `fs.watch` errors also carry `filename`, and keep Node's key order for that
  call: `errno`, `syscall`, `code`, `path`, `filename`.

Argument validation errors (`ERR_OUT_OF_RANGE`, `ERR_INVALID_OPT_VALUE`, ...)
carry `code` as their only own key, no `errno` or `syscall`, as in Node. `fs.rm`
on a directory without `recursive` throws Node's `SystemError` with code
`ERR_FS_EISDIR`, a positive `errno` and an `info` object.

The `ErrnoException` type describing the libuv shape is exported from `memfs`.
