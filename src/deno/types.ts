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
