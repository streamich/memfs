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
- [ ] Functions
  - [ ] Deno.chmod
  - [ ] Deno.chmodSync
  - [ ] Deno.chown
  - [ ] Deno.chownSync
  - [ ] Deno.copyFile
  - [ ] Deno.copyFileSync
  - [ ] Deno.create
  - [ ] Deno.createSync
  - [ ] Deno.link
  - [ ] Deno.linkSync
  - [ ] Deno.lstat
  - [ ] Deno.lstatSync
  - [ ] Deno.makeTempDir
  - [ ] Deno.makeTempDirSync
  - [ ] Deno.makeTempFile
  - [ ] Deno.makeTempFileSync
  - [ ] Deno.mkdir
  - [ ] Deno.mkdirSync
  - [ ] Deno.open
  - [ ] Deno.openSync
  - [ ] Deno.readDir
  - [ ] Deno.readDirSync
  - [ ] Deno.readFile
  - [ ] Deno.readFileSync
  - [ ] Deno.readLink
  - [ ] Deno.readLinkSync
  - [ ] Deno.readTextFile
  - [ ] Deno.readTextFileSync
  - [ ] Deno.realPath
  - [ ] Deno.realPathSync
  - [ ] Deno.remove
  - [ ] Deno.removeSync
  - [ ] Deno.rename
  - [ ] Deno.renameSync
  - [ ] Deno.stat
  - [ ] Deno.statSync
  - [ ] Deno.symlink
  - [ ] Deno.symlinkSync
  - [ ] Deno.truncate
  - [ ] Deno.truncateSync
  - [ ] Deno.umask
  - [ ] Deno.utime
  - [ ] Deno.utimeSync
  - [ ] Deno.watchFs
  - [ ] Deno.writeFile
  - [ ] Deno.writeFileSync
  - [ ] Deno.writeTextFile
  - [ ] Deno.writeTextFileSync
- [ ] Interfaces
  - [ ] Deno.DirEntry
  - [ ] Deno.FileInfo
  - [ ] Deno.FsEvent
  - [ ] Deno.FsWatcher
  - [ ] Deno.MakeTempOptions
  - [ ] Deno.MkdirOptions
  - [ ] Deno.OpenOptions
  - [ ] Deno.ReadFileOptions
  - [ ] Deno.RemoveOptions
  - [ ] Deno.SymlinkOptions
  - [ ] Deno.WriteFileOptions
- Type Aliases
  - [ ] Deno.FsEventFlag
