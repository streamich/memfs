This module implements Deno's fs module on top of memfs (an in-memory Deno-fs API). It
implements a Deno files system API on top of `Superblock` class `src/core/Superblock.ts`
from `src/core` folder. Similar to Node implementation in `src/node/` folder and
File System (Access) API implementation in `src/fsa/` folder.

See detailed interfaces of Deno types in `demo/vendor/deno.ts`. Move implemented
functions and interfaces into `src/deno/types.ts` file.

Implement one-by-one all Deno file system related functions, classes and interfaces
listed below. Mark them as done when implemented. Implement the standalone functions
in `CoreDeno` class.

Implement interfaces as standalone files in `src/deno`, for example, the `FsFile`
class should be implemented in `src/deno/DenoFsFile.ts` file as `DenoFsFile` class.

Create tests for each function and interface in `src/deno/__tests__` folder. Create
a separate test file for each function and interface, like `src/deno/__tests__/CoreDeno.<function_name>.test.ts`.
Use `src/deno/__tests__/fixtures.ts` file to create a `CoreDeno` instance with an
optional initial file system structure.

Implementation of Deno's fs module on top of memfs.

- [ ] Classes
  - [ ] Deno.FsFile
- [x] Functions
  - [x] Deno.chmod
  - [x] Deno.chmodSync
  - [x] Deno.chown
  - [x] Deno.chownSync
  - [x] Deno.copyFile
  - [x] Deno.copyFileSync
  - [x] Deno.create
  - [x] Deno.createSync
  - [x] Deno.link
  - [x] Deno.linkSync
  - [x] Deno.lstat
  - [x] Deno.lstatSync
  - [x] Deno.makeTempDir
  - [x] Deno.makeTempDirSync
  - [x] Deno.makeTempFile
  - [x] Deno.makeTempFileSync
  - [x] Deno.mkdir
  - [x] Deno.mkdirSync
  - [x] Deno.open
  - [x] Deno.openSync
  - [x] Deno.readDir
  - [x] Deno.readDirSync
  - [x] Deno.readFile
  - [x] Deno.readFileSync
  - [x] Deno.readLink
  - [x] Deno.readLinkSync
  - [x] Deno.readTextFile
  - [x] Deno.readTextFileSync
  - [x] Deno.realPath
  - [x] Deno.realPathSync
  - [x] Deno.remove
  - [x] Deno.removeSync
  - [x] Deno.rename
  - [x] Deno.renameSync
  - [x] Deno.stat
  - [x] Deno.statSync
  - [x] Deno.symlink
  - [x] Deno.symlinkSync
  - [x] Deno.truncate
  - [x] Deno.truncateSync
  - [x] Deno.umask
  - [x] Deno.utime
  - [x] Deno.utimeSync
  - [x] Deno.watchFs
  - [x] Deno.writeFile
  - [x] Deno.writeFileSync
  - [x] Deno.writeTextFile
  - [x] Deno.writeTextFileSync
- [x] Interfaces
  - [x] Deno.DirEntry
  - [x] Deno.FileInfo
  - [x] Deno.FsEvent
  - [x] Deno.FsWatcher
  - [x] Deno.MakeTempOptions
  - [x] Deno.MkdirOptions
  - [x] Deno.OpenOptions
  - [x] Deno.ReadFileOptions
  - [x] Deno.RemoveOptions
  - [x] Deno.SymlinkOptions
  - [x] Deno.WriteFileOptions
- [x] Type Aliases
  - [x] Deno.FsEventFlag
