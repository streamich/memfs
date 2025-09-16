export interface DenoFs {
  /**
   * Creates a new directory with the specified path.
   *
   * ```ts
   * await Deno.mkdir("new_dir");
   * await Deno.mkdir("nested/directories", { recursive: true });
   * await Deno.mkdir("restricted_access_dir", { mode: 0o700 });
   * ```
   *
   * Defaults to throwing error if the directory already exists.
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  mkdir: (path: string | URL, options?: DenoMkdirOptions) => Promise<void>;

  /**
   * Synchronously creates a new directory with the specified path.
   *
   * ```ts
   * Deno.mkdirSync("new_dir");
   * Deno.mkdirSync("nested/directories", { recursive: true });
   * Deno.mkdirSync("restricted_access_dir", { mode: 0o700 });
   * ```
   *
   * Defaults to throwing error if the directory already exists.
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  mkdirSync: (path: string | URL, options?: DenoMkdirOptions) => void;

  /**
   * Creates `newpath` as a hard link to `oldpath`.
   *
   * ```ts
   * await Deno.link("old/name", "new/name");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  link: (oldpath: string, newpath: string) => Promise<void>;

  /**
   * Synchronously creates `newpath` as a hard link to `oldpath`.
   *
   * ```ts
   * Deno.linkSync("old/name", "new/name");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  linkSync: (oldpath: string, newpath: string) => void;

  /**
   * Open a file and resolve to an instance of {@linkcode DenoFsFile}.
   *
   * ```ts
   * using file = await Deno.open("/foo/bar.txt", { read: true, write: true });
   * // Do work with file
   * ```
   *
   * Requires `allow-read` and/or `allow-write` permissions depending on options.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  open: (path: string | URL, options?: DenoOpenOptions) => Promise<DenoFsFile>;

  /**
   * Synchronously open a file and return an instance of {@linkcode DenoFsFile}.
   *
   * ```ts
   * using file = Deno.openSync("/foo/bar.txt", { read: true, write: true });
   * // Do work with file
   * ```
   *
   * Requires `allow-read` and/or `allow-write` permissions depending on options.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  openSync: (path: string | URL, options?: DenoOpenOptions) => DenoFsFile;

  /**
   * Creates a file if none exists or truncates an existing file and resolves to
   * an instance of {@linkcode DenoFsFile}.
   *
   * ```ts
   * const file = await Deno.create("/foo/bar.txt");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  create: (path: string | URL) => Promise<DenoFsFile>;

  /**
   * Creates a file if none exists or truncates an existing file and returns
   * an instance of {@linkcode DenoFsFile}.
   *
   * ```ts
   * const file = Deno.createSync("/foo/bar.txt");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  createSync: (path: string | URL) => DenoFsFile;

  /**
   * Creates a new temporary directory in the default directory for temporary
   * files, unless `dir` is specified.
   *
   * ```ts
   * const tempDirName0 = await Deno.makeTempDir();  // e.g. /tmp/2894ea76
   * const tempDirName1 = await Deno.makeTempDir({ prefix: 'my_temp' }); // e.g. /tmp/my_temp339c944d
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  makeTempDir: (options?: DenoMakeTempOptions) => Promise<string>;

  /**
   * Synchronously creates a new temporary directory in the default directory
   * for temporary files, unless `dir` is specified.
   *
   * ```ts
   * const tempDirName0 = Deno.makeTempDirSync();  // e.g. /tmp/2894ea76
   * const tempDirName1 = Deno.makeTempDirSync({ prefix: 'my_temp' });  // e.g. /tmp/my_temp339c944d
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  makeTempDirSync: (options?: DenoMakeTempOptions) => string;

  /**
   * Creates a new temporary file in the default directory for temporary
   * files, unless `dir` is specified.
   *
   * ```ts
   * const tmpFileName0 = await Deno.makeTempFile();  // e.g. /tmp/419e0bf2
   * const tmpFileName1 = await Deno.makeTempFile({ prefix: 'my_temp' });  // e.g. /tmp/my_temp754d3098
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  makeTempFile: (options?: DenoMakeTempOptions) => Promise<string>;

  /**
   * Synchronously creates a new temporary file in the default directory for
   * temporary files, unless `dir` is specified.
   *
   * ```ts
   * const tempFileName0 = Deno.makeTempFileSync(); // e.g. /tmp/419e0bf2
   * const tempFileName1 = Deno.makeTempFileSync({ prefix: 'my_temp' });  // e.g. /tmp/my_temp754d3098
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  makeTempFileSync: (options?: DenoMakeTempOptions) => string;

  /**
   * Changes the permission of a specific file/directory of specified path.
   *
   * ```ts
   * await Deno.chmod("/path/to/file", 0o666);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  chmod: (path: string | URL, mode: number) => Promise<void>;

  /**
   * Synchronously changes the permission of a specific file/directory of
   * specified path.
   *
   * ```ts
   * Deno.chmodSync("/path/to/file", 0o666);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  chmodSync: (path: string | URL, mode: number) => void;

  /**
   * Change owner of a regular file or directory.
   *
   * ```ts
   * await Deno.chown("myFile.txt", 1000, 1002);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  chown: (path: string | URL, uid: number | null, gid: number | null) => Promise<void>;

  /**
   * Synchronously change owner of a regular file or directory.
   *
   * ```ts
   * Deno.chownSync("myFile.txt", 1000, 1002);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  chownSync: (path: string | URL, uid: number | null, gid: number | null) => void;

  /**
   * Removes the named file or directory.
   *
   * ```ts
   * await Deno.remove("/path/to/empty_dir/or/file");
   * await Deno.remove("/path/to/populated_dir/or/file", { recursive: true });
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  remove: (path: string | URL, options?: DenoRemoveOptions) => Promise<void>;

  /**
   * Synchronously removes the named file or directory.
   *
   * ```ts
   * Deno.removeSync("/path/to/empty_dir/or/file");
   * Deno.removeSync("/path/to/populated_dir/or/file", { recursive: true });
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  removeSync: (path: string | URL, options?: DenoRemoveOptions) => void;

  /**
   * Renames (moves) `oldpath` to `newpath`.
   *
   * ```ts
   * await Deno.rename("old/path", "new/path");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  rename: (oldpath: string | URL, newpath: string | URL) => Promise<void>;

  /**
   * Synchronously renames (moves) `oldpath` to `newpath`.
   *
   * ```ts
   * Deno.renameSync("old/path", "new/path");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  renameSync: (oldpath: string | URL, newpath: string | URL) => void;

  /**
   * Asynchronously reads and returns the entire contents of a file as an UTF-8
   * decoded string.
   *
   * ```ts
   * const data = await Deno.readTextFile("hello.txt");
   * console.log(data);
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readTextFile: (path: string | URL, options?: DenoReadFileOptions) => Promise<string>;

  /**
   * Synchronously reads and returns the entire contents of a file as an UTF-8
   * decoded string.
   *
   * ```ts
   * const data = Deno.readTextFileSync("hello.txt");
   * console.log(data);
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readTextFileSync: (path: string | URL) => string;

  /**
   * Reads and resolves to the entire contents of a file as an array of bytes.
   *
   * ```ts
   * const decoder = new TextDecoder("utf-8");
   * const data = await Deno.readFile("hello.txt");
   * console.log(decoder.decode(data));
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readFile: (path: string | URL, options?: DenoReadFileOptions) => Promise<Uint8Array>;

  /**
   * Synchronously reads and returns the entire contents of a file as an array
   * of bytes.
   *
   * ```ts
   * const decoder = new TextDecoder("utf-8");
   * const data = Deno.readFileSync("hello.txt");
   * console.log(decoder.decode(data));
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readFileSync: (path: string | URL) => Uint8Array;

  /**
   * Resolves to the absolute normalized path, with symbolic links resolved.
   *
   * ```ts
   * const realPath = await Deno.realPath("./file.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  realPath: (path: string | URL) => Promise<string>;

  /**
   * Synchronously returns absolute normalized path, with symbolic links resolved.
   *
   * ```ts
   * const realPath = Deno.realPathSync("./file.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  realPathSync: (path: string | URL) => string;

  /**
   * Reads the directory given by `path` and returns an async iterable of
   * {@linkcode DenoDirEntry}.
   *
   * ```ts
   * for await (const dirEntry of Deno.readDir("/")) {
   *   console.log(dirEntry.name);
   * }
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readDir: (path: string | URL) => AsyncIterable<DenoDirEntry>;

  /**
   * Synchronously reads the directory given by `path` and returns an iterable
   * of {@linkcode DenoDirEntry}.
   *
   * ```ts
   * for (const dirEntry of Deno.readDirSync("/")) {
   *   console.log(dirEntry.name);
   * }
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readDirSync: (path: string | URL) => IterableIterator<DenoDirEntry>;

  /**
   * Copies the contents and permissions of one file to another specified path.
   *
   * ```ts
   * await Deno.copyFile("from.txt", "to.txt");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  copyFile: (fromPath: string | URL, toPath: string | URL) => Promise<void>;

  /**
   * Synchronously copies the contents and permissions of one file to another specified path.
   *
   * ```ts
   * Deno.copyFileSync("from.txt", "to.txt");
   * ```
   *
   * Requires `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  copyFileSync: (fromPath: string | URL, toPath: string | URL) => void;

  /**
   * Resolves to the full path destination of the named symbolic link.
   *
   * ```ts
   * const target = await Deno.readLink("./test_link.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readLink: (path: string | URL) => Promise<string>;

  /**
   * Synchronously returns the full path destination of the named symbolic link.
   *
   * ```ts
   * const target = Deno.readLinkSync("./test_link.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  readLinkSync: (path: string | URL) => string;

  /**
   * Resolves to a {@linkcode DenoFileInfo} for the specified `path`. If
   * `path` is a symlink, information for the symlink will be returned instead
   * of what it points to.
   *
   * ```ts
   * const fileInfo = await Deno.lstat("hello.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  lstat: (path: string | URL) => Promise<DenoFileInfo>;

  /**
   * Synchronously returns a {@linkcode DenoFileInfo} for the specified
   * `path`. If `path` is a symlink, information for the symlink will be
   * returned instead of what it points to.
   *
   * ```ts
   * const fileInfo = Deno.lstatSync("hello.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  lstatSync: (path: string | URL) => DenoFileInfo;

  /**
   * Resolves to a {@linkcode DenoFileInfo} for the specified `path`. Will
   * always follow symlinks.
   *
   * ```ts
   * const fileInfo = await Deno.stat("hello.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  stat: (path: string | URL) => Promise<DenoFileInfo>;

  /**
   * Synchronously returns a {@linkcode DenoFileInfo} for the specified
   * `path`. Will always follow symlinks.
   *
   * ```ts
   * const fileInfo = Deno.statSync("hello.txt");
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  statSync: (path: string | URL) => DenoFileInfo;

  /**
   * Write `data` to the given `path`, by default creating a new file if
   * needed, else overwriting.
   *
   * ```ts
   * const encoder = new TextEncoder();
   * const data = encoder.encode("Hello world\n");
   * await Deno.writeFile("hello1.txt", data);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  writeFile: (path: string | URL, data: Uint8Array | ReadableStream<Uint8Array>, options?: DenoWriteFileOptions) => Promise<void>;

  /**
   * Synchronously write `data` to the given `path`, by default creating a new
   * file if needed, else overwriting.
   *
   * ```ts
   * const encoder = new TextEncoder();
   * const data = encoder.encode("Hello world\n");
   * Deno.writeFileSync("hello1.txt", data);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  writeFileSync: (path: string | URL, data: Uint8Array, options?: DenoWriteFileOptions) => void;

  /**
   * Write string `data` to the given `path`, by default creating a new file if
   * needed, else overwriting.
   *
   * ```ts
   * await Deno.writeTextFile("hello1.txt", "Hello world\n");
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  writeTextFile: (path: string | URL, data: string | ReadableStream<string>, options?: DenoWriteFileOptions) => Promise<void>;

  /**
   * Synchronously write string `data` to the given `path`, by default creating
   * a new file if needed, else overwriting.
   *
   * ```ts
   * Deno.writeTextFileSync("hello1.txt", "Hello world\n");
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  writeTextFileSync: (path: string | URL, data: string, options?: DenoWriteFileOptions) => void;

  /**
   * Truncates (or extends) the specified file, to reach the specified `len`.
   *
   * ```ts
   * await Deno.truncate("my_file.txt", 10);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  truncate: (name: string, len?: number) => Promise<void>;

  /**
   * Synchronously truncates (or extends) the specified file, to reach the
   * specified `len`.
   *
   * ```ts
   * Deno.truncateSync("my_file.txt", 10);
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  truncateSync: (name: string, len?: number) => void;

  /**
   * Creates `newpath` as a symbolic link to `oldpath`.
   *
   * ```ts
   * await Deno.symlink("old/name", "new/name");
   * ```
   *
   * Requires full `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  symlink: (oldpath: string | URL, newpath: string | URL, options?: DenoSymlinkOptions) => Promise<void>;

  /**
   * Creates `newpath` as a symbolic link to `oldpath`.
   *
   * ```ts
   * Deno.symlinkSync("old/name", "new/name");
   * ```
   *
   * Requires full `allow-read` and `allow-write` permissions.
   *
   * @tags allow-read, allow-write
   * @category File System
   */
  symlinkSync: (oldpath: string | URL, newpath: string | URL, options?: DenoSymlinkOptions) => void;

  /**
   * Synchronously changes the access (`atime`) and modification (`mtime`) times
   * of a file system object referenced by `path`.
   *
   * ```ts
   * Deno.utimeSync("myfile.txt", 1556495550, new Date());
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  utimeSync: (path: string | URL, atime: number | Date, mtime: number | Date) => void;

  /**
   * Changes the access (`atime`) and modification (`mtime`) times of a file
   * system object referenced by `path`.
   *
   * ```ts
   * await Deno.utime("myfile.txt", 1556495550, new Date());
   * ```
   *
   * Requires `allow-write` permission.
   *
   * @tags allow-write
   * @category File System
   */
  utime: (path: string | URL, atime: number | Date, mtime: number | Date) => Promise<void>;

  /**
   * Watch for file system events against one or more `paths`.
   *
   * ```ts
   * const watcher = Deno.watchFs("/");
   * for await (const event of watcher) {
   *    console.log(">>>> event", event);
   * }
   * ```
   *
   * Requires `allow-read` permission.
   *
   * @tags allow-read
   * @category File System
   */
  watchFs: (paths: string | string[], options?: { recursive: boolean }) => DenoFsWatcher;

  /**
   * Retrieve the process umask. If `mask` is provided, sets the process umask.
   * This call always returns what the umask was before the call.
   *
   * ```ts
   * console.log(Deno.umask());  // e.g. 18 (0o022)
   * const prevUmaskValue = Deno.umask(0o077);  // e.g. 18 (0o022)
   * console.log(Deno.umask());  // e.g. 63 (0o077)
   * ```
   *
   * *Note*: This API is not implemented on Windows
   *
   * @category File System
   */
  umask: (mask?: number) => number;
}

/**
 * Options which can be set when using {@linkcode DenoFs.mkdir} and
 * {@linkcode DenoFs.mkdirSync}.
 *
 * @category File System
 */
export interface DenoMkdirOptions {
  /**
   * If set to `true`, means that any intermediate directories will also be
   * created (as with the shell command `mkdir -p`).
   *
   * Intermediate directories are created with the same permissions.
   *
   * When recursive is set to `true`, succeeds silently (without changing any
   * permissions) if a directory already exists at the path, or if the path
   * is a symlink to an existing directory.
   *
   * @default {false}
   */
  recursive?: boolean;

  /**
   * Permissions to use when creating the directory (defaults to `0o777`,
   * before the process's umask).
   */
  mode?: number;
}

/**
 * Options which can be set when doing {@linkcode DenoFs.open} and
 * {@linkcode DenoFs.openSync}.
 *
 * @category File System
 */
export interface DenoOpenOptions {
  /** Sets the option for read access.
   *
   * @default {true} */
  read?: boolean;
  /** Sets the option for write access.
   *
   * @default {false} */
  write?: boolean;
  /** Sets the option for the append mode.
   *
   * @default {false} */
  append?: boolean;
  /** Sets the option for truncating a previous file.
   *
   * @default {false} */
  truncate?: boolean;
  /** Sets the option to allow creating a new file.
   *
   * @default {false} */
  create?: boolean;
  /** If set to `true`, no file, directory, or symlink is allowed to exist at
   * the target location.
   *
   * @default {false} */
  createNew?: boolean;
  /** Permissions to use if creating the file.
   *
   * Ignored on Windows. */
  mode?: number;
}

/**
 * Options which can be set when using {@linkcode DenoFs.readFile} or
 * {@linkcode DenoFs.readFileSync}.
 *
 * @category File System
 */
export interface DenoReadFileOptions {
  /**
   * An abort signal to allow cancellation of the file read operation.
   */
  signal?: AbortSignal;
}

/**
 * Options which can be set when using {@linkcode DenoFs.makeTempDir},
 * {@linkcode DenoFs.makeTempDirSync}, {@linkcode DenoFs.makeTempFile}, and
 * {@linkcode DenoFs.makeTempFileSync}.
 *
 * @category File System
 */
export interface DenoMakeTempOptions {
  /** Directory where the temporary directory should be created. */
  dir?: string;
  /** String that should precede the random portion of the temporary
   * directory's name. */
  prefix?: string;
  /** String that should follow the random portion of the temporary
   * directory's name. */
  suffix?: string;
}

/**
 * Options which can be set when using {@linkcode DenoFs.remove} and
 * {@linkcode DenoFs.removeSync}.
 *
 * @category File System
 */
export interface DenoRemoveOptions {
  /** If set to `true`, path will be removed even if it's a non-empty directory.
   *
   * @default {false} */
  recursive?: boolean;
}

/**
 * Options for writing to a file.
 *
 * @category File System
 */
export interface DenoWriteFileOptions {
  /** If set to `true`, will append to a file instead of overwriting previous
   * contents.
   *
   * @default {false} */
  append?: boolean;
  /** Sets the option to allow creating a new file.
   *
   * @default {true} */
  create?: boolean;
  /** If set to `true`, no file, directory, or symlink is allowed to exist at
   * the target location.
   *
   * @default {false} */
  createNew?: boolean;
  /** Permissions always applied to file. */
  mode?: number;
  /** An abort signal to allow cancellation of the file write operation. */
  signal?: AbortSignal;
}

/**
 * Options that can be used with {@linkcode DenoFs.symlink} and
 * {@linkcode DenoFs.symlinkSync}.
 *
 * @category File System
 */
export interface DenoSymlinkOptions {
  /** Specify the symbolic link type as file, directory or NTFS junction. This
   * option only applies to Windows and is ignored on other operating systems. */
  type?: "file" | "dir" | "junction";
}

/**
 * Provides information about a file and is returned by
 * {@linkcode DenoFs.stat}, {@linkcode DenoFs.lstat}, {@linkcode DenoFs.statSync},
 * and {@linkcode DenoFs.lstatSync}.
 *
 * @category File System
 */
export interface DenoFileInfo {
  /** True if this is info for a regular file. */
  isFile: boolean;
  /** True if this is info for a regular directory. */
  isDirectory: boolean;
  /** True if this is info for a symlink. */
  isSymlink: boolean;
  /** The size of the file, in bytes. */
  size: number;
  /** The last modification time of the file. */
  mtime: Date | null;
  /** The last access time of the file. */
  atime: Date | null;
  /** The creation time of the file. */
  birthtime: Date | null;
  /** The last change time of the file. */
  ctime: Date | null;
  /** ID of the device containing the file. */
  dev: number;
  /** Inode number. */
  ino: number | null;
  /** The underlying raw `st_mode` bits that contain the standard Unix
   * permissions for this file/directory. */
  mode: number | null;
  /** Number of hard links pointing to this file. */
  nlink: number | null;
  /** User ID of the owner of this file. */
  uid: number | null;
  /** Group ID of the owner of this file. */
  gid: number | null;
  /** Device ID of this file. */
  rdev: number | null;
  /** Blocksize for filesystem I/O. */
  blksize: number | null;
  /** Number of blocks allocated to the file, in 512-byte units. */
  blocks: number | null;
  /** True if this is info for a block device. */
  isBlockDevice: boolean | null;
  /** True if this is info for a char device. */
  isCharDevice: boolean | null;
  /** True if this is info for a fifo. */
  isFifo: boolean | null;
  /** True if this is info for a socket. */
  isSocket: boolean | null;
}

/**
 * Information about a directory entry returned from {@linkcode DenoFs.readDir}
 * and {@linkcode DenoFs.readDirSync}.
 *
 * @category File System
 */
export interface DenoDirEntry {
  /** The file name of the entry. */
  name: string;
  /** True if this is info for a regular file. */
  isFile: boolean;
  /** True if this is info for a regular directory. */
  isDirectory: boolean;
  /** True if this is info for a symlink. */
  isSymlink: boolean;
}

/**
 * A enum which defines the seek mode for IO related APIs that support
 * seeking.
 *
 * @category I/O
 */
export enum DenoSeekMode {
  /* Seek from the start of the file/resource. */
  Start = 0,
  /* Seek from the current position within the file/resource. */
  Current = 1,
  /* Seek from the end of the current file/resource. */
  End = 2,
}

/**
 * The Deno abstraction for reading and writing files.
 *
 * @category File System
 */
export interface DenoFsFile {
  /** A {@linkcode ReadableStream} instance representing to the byte contents
   * of the file. */
  readonly readable: ReadableStream<Uint8Array>;
  /** A {@linkcode WritableStream} instance to write the contents of the
   * file. */
  readonly writable: WritableStream<Uint8Array>;
  /** Write the contents of the array buffer (`p`) to the file. */
  write(p: Uint8Array): Promise<number>;
  /** Synchronously write the contents of the array buffer (`p`) to the file. */
  writeSync(p: Uint8Array): number;
  /** Truncates (or extends) the file to reach the specified `len`. */
  truncate(len?: number): Promise<void>;
  /** Synchronously truncates (or extends) the file to reach the specified
   * `len`. */
  truncateSync(len?: number): void;
  /** Read the file into an array buffer (`p`). */
  read(p: Uint8Array): Promise<number | null>;
  /** Synchronously read from the file into an array buffer (`p`). */
  readSync(p: Uint8Array): number | null;
  /** Seek to the given `offset` under mode given by `whence`. */
  seek(offset: number | bigint, whence: DenoSeekMode): Promise<number>;
  /** Synchronously seek to the given `offset` under mode given by `whence`. */
  seekSync(offset: number | bigint, whence: DenoSeekMode): number;
  /** Resolves to a {@linkcode DenoFileInfo} for the file. */
  stat(): Promise<DenoFileInfo>;
  /** Synchronously returns a {@linkcode DenoFileInfo} for the file. */
  statSync(): DenoFileInfo;
  /** Flushes any pending data and metadata operations of the given file
   * stream to disk. */
  sync(): Promise<void>;
  /** Synchronously flushes any pending data and metadata operations of the given
   * file stream to disk. */
  syncSync(): void;
  /** Flushes any pending data operations of the given file stream to disk. */
  syncData(): Promise<void>;
  /** Synchronously flushes any pending data operations of the given file stream
   * to disk. */
  syncDataSync(): void;
  /** Changes the access (`atime`) and modification (`mtime`) times of the
   * file stream resource. */
  utime(atime: number | Date, mtime: number | Date): Promise<void>;
  /** Synchronously changes the access (`atime`) and modification (`mtime`)
   * times of the file stream resource. */
  utimeSync(atime: number | Date, mtime: number | Date): void;
  /** Checks if the file resource is a TTY (terminal). */
  isTerminal(): boolean;
  /** Set TTY to be under raw mode or not. */
  setRaw(mode: boolean, options?: DenoSetRawOptions): void;
  /** Acquire an advisory file-system lock for the file. */
  lock(exclusive?: boolean): Promise<void>;
  /** Synchronously acquire an advisory file-system lock synchronously for the file. */
  lockSync(exclusive?: boolean): void;
  /** Release an advisory file-system lock for the file. */
  unlock(): Promise<void>;
  /** Synchronously release an advisory file-system lock for the file. */
  unlockSync(): void;
  /** Close the file. */
  close(): void;
}

/**
 * @category I/O
 */
export interface DenoSetRawOptions {
  /** The `cbreak` option can be used to indicate that characters that
   * correspond to a signal should still be generated. */
  cbreak?: boolean;
}

/**
 * Additional information for FsEvent objects with the "other" kind.
 *
 * @category File System
 */
export type DenoFsEventFlag = "rescan";

/**
 * Represents a unique file system event.
 *
 * @category File System
 */
export interface DenoFsEvent {
  /** The kind/type of the file system event. */
  kind: "any" | "access" | "create" | "modify" | "rename" | "remove" | "other";
  /** An array of paths that are associated with the file system event. */
  paths: string[];
  /** Any additional flags associated with the event. */
  flag?: DenoFsEventFlag;
}

/**
 * Returned by {@linkcode DenoFs.watchFs}.
 *
 * @category File System
 */
export interface DenoFsWatcher extends AsyncIterable<DenoFsEvent> {
  /** Stops watching the file system and closes the watcher resource. */
  close(): void;
  /**
   * Stops watching the file system and closes the watcher resource.
   */
  return?(value?: any): Promise<IteratorResult<DenoFsEvent>>;
  [Symbol.asyncIterator](): AsyncIterableIterator<DenoFsEvent>;
}
