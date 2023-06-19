This demo shows how `tar-stream` package can be used to create a zip file from
a folder selected with File System Access API.

It creates two text files using `fs.promises.writeFile`, and then uses `tar-stream` package to create a zip file
and write it back got the file system using Node's `fs.createWriteStream`.
