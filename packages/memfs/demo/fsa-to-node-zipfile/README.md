This demo shows how `tar-stream` package can be used to create a zip file from
a folder selected with File System Access API.

Below demo uses the File System Access API in the browser to get access to a real folder
on the file system. It then converts a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) instance
to a Node-like `fs` file system.

It then creates two text files using `fs.promises.writeFile`, and then uses `tar-stream` package to create a zip file
and write it back got the file system using Node's `fs.createWriteStream`.

https://github.com/streamich/memfs/assets/9773803/8dc61d1e-61bf-4dfc-973b-028332fd4473

Run:

```
demo:fsa-to-node-zipfile
```
