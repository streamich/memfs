import { sep, relative, join, dirname, isAbsolute, basename, posix } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { Node } from './Node';
import { Link } from './Link';
import { File } from './File';
import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import process from './process';
import { constants } from '@jsonjoy.com/fs-node-utils';
import { ERRSTR, FLAGS, MODE } from '@jsonjoy.com/fs-node-utils';
import {
  pathToFilename,
  createError,
  createStatError,
  dataToBuffer,
  filenameToSteps,
  isFd,
  resolve,
  validateFd,
} from './util';
import { DirectoryJSON, flattenJSON, NestedDirectoryJSON } from './json';
import type { PathLike } from '@jsonjoy.com/fs-node-utils/lib/types/misc';
import { ERROR_CODE } from './constants';
import { TFileId, StatError } from './types';
import { Err, Ok, Result } from './result';

const pathSep = posix ? posix.sep : sep;
const pathRelative = posix ? posix.relative : relative;
const pathJoin = posix ? posix.join : join;

const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY } = constants;

/**
 * Represents options for creating a Superblock from JSON.
 */
export type SuperblockFromJsonOptions = {
  /**
   * Current working directory, absolute path.
   * Methods will use this as the base path for relative paths.
   *
   * @default process.cwd()
   */
  cwd?: string;
  /**
   * This is the mount point where the JSON structure will be mounted.
   * It is used as the base path for all paths in the JSON structure.
   *
   * @default SuperblockFromJsonOptions.cwd
   */
  mountpoint?: string;
};

/**
 * Represents a filesystem superblock, which is the root of a virtual
 * filesystem in Linux.
 * @see https://lxr.linux.no/linux+v3.11.2/include/linux/fs.h#L1242
 */
export class Superblock {
  static fromJSON(json: DirectoryJSON, options?: SuperblockFromJsonOptions): Superblock {
    const vol = new Superblock();
    vol.fromJSON(json, options);
    return vol;
  }

  static fromNestedJSON(json: NestedDirectoryJSON, options?: SuperblockFromJsonOptions): Superblock {
    const vol = new Superblock();
    vol.fromNestedJSON(json, options);
    return vol;
  }

  /**
   * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
   * up, so here, in order not to conflict with them, we choose some big number and descrease
   * the file descriptor of every new opened file.
   * @type {number}
   * @todo This should not be static, right?
   */
  static fd: number = 0x7fffffff;

  // Constructor function used to create new nodes.
  // NodeClass: new (...args) => TNode = Node as new (...args) => TNode;

  // Hard link to the root of this volume.
  // root: Node = new (this.NodeClass)(null, '', true);
  root: Link;

  // I-node number counter.
  ino: number = 0;

  // A mapping for i-node numbers to i-nodes (`Node`);
  inodes: { [ino: number]: Node } = {};

  // List of released i-node numbers, for reuse.
  releasedInos: number[] = [];

  // A mapping for file descriptors to `File`s.
  fds: { [fd: number]: File } = {};

  // A list of reusable (opened and closed) file descriptors, that should be
  // used first before creating a new file descriptor.
  releasedFds: number[] = [];

  // Max number of open files.
  maxFiles = 10000;

  // Current number of open files.
  openFiles = 0;

  constructor(props = {}) {
    const root = this.createLink();
    root.setNode(this.createNode(constants.S_IFDIR | 0o777));

    root.setChild('.', root);
    root.getNode().nlink++;

    root.setChild('..', root);
    root.getNode().nlink++;

    this.root = root;
  }

  protected _cwd: string = '/';
  get cwd(): string {
    return this._cwd;
  }
  set cwd(value: string) {
    this._cwd = value;
  }

  createLink(): Link;
  createLink(parent: Link, name: string, isDirectory?: boolean, mode?: number): Link;
  createLink(parent?: Link, name?: string, isDirectory: boolean = false, mode?: number): Link {
    if (!parent) {
      return new Link(this, void 0, '');
    }

    if (!name) {
      throw new Error('createLink: name cannot be empty');
    }

    // If no explicit permission is provided, use defaults based on type
    const finalPerm = mode ?? (isDirectory ? 0o777 : 0o666);
    // To prevent making a breaking change, `mode` can also just be a permission number
    // and the file type is set based on `isDirectory`
    const hasFileType = mode && mode & constants.S_IFMT;
    const modeType = hasFileType ? mode & constants.S_IFMT : isDirectory ? constants.S_IFDIR : constants.S_IFREG;
    const finalMode = (finalPerm & ~constants.S_IFMT) | modeType;
    return parent.createChild(name, this.createNode(finalMode));
  }

  deleteLink(link: Link): boolean {
    const parent = link.parent;
    if (parent) {
      parent.deleteChild(link);

      return true;
    }
    return false;
  }

  private newInoNumber(): number {
    const releasedFd = this.releasedInos.pop();

    if (releasedFd) return releasedFd;
    else {
      this.ino = (this.ino + 1) % 0xffffffff;
      return this.ino;
    }
  }

  private newFdNumber(): number {
    const releasedFd = this.releasedFds.pop();
    return typeof releasedFd === 'number' ? releasedFd : Superblock.fd--;
  }

  createNode(mode: number): Node {
    const node = new Node(this.newInoNumber(), mode);
    this.inodes[node.ino] = node;
    return node;
  }

  deleteNode(node: Node) {
    node.del();
    delete this.inodes[node.ino];
    this.releasedInos.push(node.ino);
  }

  walk(
    steps: string[],
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Result<Link | null, StatError>;
  walk(
    filename: string,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Result<Link | null, StatError>;
  walk(
    link: Link,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Result<Link | null, StatError>;
  walk(
    stepsOrFilenameOrLink: string[] | string | Link,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Result<Link | null, StatError>;
  walk(
    stepsOrFilenameOrLink: string[] | string | Link,
    resolveSymlinks: boolean = false,
    checkExistence: boolean = false,
    checkAccess: boolean = false,
    funcName?: string,
  ): Result<Link | null, StatError> {
    let steps: string[];
    let filename: string;
    if (stepsOrFilenameOrLink instanceof Link) {
      steps = stepsOrFilenameOrLink.steps;
      filename = pathSep + steps.join(pathSep);
    } else if (typeof stepsOrFilenameOrLink === 'string') {
      steps = filenameToSteps(stepsOrFilenameOrLink, this.cwd);
      filename = stepsOrFilenameOrLink;
    } else {
      steps = stepsOrFilenameOrLink;
      filename = pathSep + steps.join(pathSep);
    }

    let curr: Link | null = this.root;
    let i = 0;
    while (i < steps.length) {
      let node: Node = curr.getNode();
      // Check access permissions if current link is a directory
      if (node.isDirectory()) {
        if (checkAccess && !node.canExecute()) {
          return Err(createStatError(ERROR_CODE.EACCES, funcName, filename));
        }
      } else {
        if (i < steps.length - 1) {
          return Err(createStatError(ERROR_CODE.ENOTDIR, funcName, filename));
        }
      }

      curr = curr.getChild(steps[i]) ?? null;

      // Check existence of current link
      if (!curr)
        if (checkExistence) {
          return Err(createStatError(ERROR_CODE.ENOENT, funcName, filename));
        } else {
          return Ok(null);
        }

      node = curr?.getNode();

      // Resolve symlink if we're resolving all symlinks OR if this is an intermediate path component
      // This allows lstat to traverse through symlinks in intermediate directories while not resolving the final component
      if (node.isSymlink() && (resolveSymlinks || i < steps.length - 1)) {
        const resolvedPath = isAbsolute(node.symlink) ? node.symlink : pathJoin(dirname(curr.getPath()), node.symlink); // Relative to symlink's parent

        steps = filenameToSteps(resolvedPath, this.cwd).concat(steps.slice(i + 1));
        curr = this.root;
        i = 0;
        continue;
      }

      // After resolving symlinks, check if it's not a directory and we still have more steps
      // This handles the case where we try to traverse through a file
      // Only do this check when we're doing filesystem operations (checkExistence = true)
      if (checkExistence && !node.isDirectory() && i < steps.length - 1) {
        // On Windows, use ENOENT for consistency with Node.js behavior
        // On other platforms, use ENOTDIR which is more semantically correct
        const errorCode = process.platform === 'win32' ? ERROR_CODE.ENOENT : ERROR_CODE.ENOTDIR;
        return Err(createStatError(errorCode, funcName, filename));
      }

      i++;
    }

    return Ok(curr);
  }

  // Returns a `Link` (hard link) referenced by path "split" into steps.
  getLink(steps: string[]): Link | null {
    const result = this.walk(steps, false, false, false);
    if (result.ok) {
      return result.value;
    }
    throw result.err.toError();
  }

  // Just link `getLink`, but throws a correct user error, if link to found.
  getLinkOrThrow(filename: string, funcName?: string): Link {
    const result = this.walk(filename, false, true, true, funcName);
    if (result.ok) {
      return result.value!;
    }
    throw result.err.toError();
  }

  // Just like `getLink`, but also dereference/resolves symbolic links.
  getResolvedLink(filenameOrSteps: string | string[]): Link | null {
    const result = this.walk(filenameOrSteps, true, false, false);
    if (result.ok) {
      return result.value;
    }
    throw result.err.toError();
  }

  /**
   * Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
   */
  getResolvedLinkOrThrow(filename: string, funcName?: string): Link {
    const result = this.walk(filename, true, true, true, funcName);
    if (result.ok) {
      return result.value!;
    }
    throw result.err.toError();
  }

  getResolvedLinkResult(filename: string, funcName?: string): Result<Link, StatError> {
    const result = this.walk(filename, true, true, true, funcName);
    if (result.ok) {
      return Ok(result.value!);
    }
    return result;
  }

  resolveSymlinks(link: Link): Link | null {
    return this.getResolvedLink(link.steps.slice(1));
  }

  /**
   * Just like `getLinkOrThrow`, but also verifies that the link is a directory.
   */
  getLinkAsDirOrThrow(filename: string, funcName?: string): Link {
    const link = this.getLinkOrThrow(filename, funcName)!;
    if (!link.getNode().isDirectory()) throw createError(ERROR_CODE.ENOTDIR, funcName, filename);
    return link;
  }

  // Get the immediate parent directory of the link.
  getLinkParent(steps: string[]): Link | null {
    return this.getLink(steps.slice(0, -1));
  }

  getLinkParentAsDirOrThrow(filenameOrSteps: string | string[], funcName?: string): Link {
    const steps: string[] = (
      filenameOrSteps instanceof Array ? filenameOrSteps : filenameToSteps(filenameOrSteps, this.cwd)
    ).slice(0, -1);
    const filename: string = pathSep + steps.join(pathSep);
    const link = this.getLinkOrThrow(filename, funcName);
    if (!link.getNode().isDirectory()) throw createError(ERROR_CODE.ENOTDIR, funcName, filename);
    return link;
  }

  getFileByFd(fd: number): File {
    return this.fds[String(fd)];
  }

  getFileByFdOrThrow(fd: number, funcName?: string): File {
    if (!isFd(fd)) throw TypeError(ERRSTR.FD);
    const file = this.getFileByFd(fd);
    if (!file) throw createError(ERROR_CODE.EBADF, funcName);
    return file;
  }

  _toJSON(link = this.root, json = {}, path?: string, asBuffer?: boolean): DirectoryJSON<string | null> {
    let isEmpty = true;

    let children = link.children;

    if (link.getNode().isFile()) {
      children = new Map([[link.getName(), link.parent!.getChild(link.getName())]]);
      link = link.parent!;
    }

    for (const name of children.keys()) {
      if (name === '.' || name === '..') {
        continue;
      }
      isEmpty = false;

      const child = link.getChild(name);

      if (!child) {
        throw new Error('_toJSON: unexpected undefined');
      }
      const node = child.getNode();
      if (node.isFile()) {
        let filename = child.getPath();
        if (path) filename = pathRelative(path, filename);
        json[filename] = asBuffer ? node.getBuffer() : node.getString();
      } else if (node.isDirectory()) {
        this._toJSON(child, json, path, asBuffer);
      }
    }

    let dirPath = link.getPath();

    if (path) dirPath = pathRelative(path, dirPath);

    if (dirPath && isEmpty) {
      json[dirPath] = null;
    }

    return json;
  }

  toJSON(paths?: PathLike | PathLike[], json = {}, isRelative = false, asBuffer = false): DirectoryJSON<string | null> {
    const links: Link[] = [];

    if (paths) {
      if (!Array.isArray(paths)) paths = [paths];
      for (const path of paths) {
        const filename = pathToFilename(path);
        const link = this.getResolvedLink(filename);
        if (!link) continue;
        links.push(link);
      }
    } else {
      links.push(this.root);
    }

    if (!links.length) return json;
    for (const link of links) this._toJSON(link, json, isRelative ? link.getPath() : '', asBuffer);
    return json;
  }

  fromJSON(json: DirectoryJSON, options?: SuperblockFromJsonOptions) {
    this.cwd = options?.cwd ?? '/';
    const mountpoint = options?.mountpoint ?? this.cwd;
    for (let filename in json) {
      const data = json[filename];
      filename = resolve(filename, mountpoint);
      if (typeof data === 'string' || data instanceof Buffer) {
        const dir = dirname(filename);
        this.mkdirp(dir, MODE.DIR);
        const buffer = dataToBuffer(data);
        this.writeFile(filename, buffer, FLAGS.w, MODE.DEFAULT);
      } else {
        this.mkdirp(filename, MODE.DIR);
      }
    }
  }

  fromNestedJSON(json: NestedDirectoryJSON, options?: SuperblockFromJsonOptions) {
    this.fromJSON(flattenJSON(json), options);
  }

  reset() {
    this.ino = 0;
    this.inodes = {};
    this.releasedInos = [];
    this.fds = {};
    this.releasedFds = [];
    this.openFiles = 0;

    this.root = this.createLink();
    this.root.setNode(this.createNode(constants.S_IFDIR | 0o777));
  }

  // Legacy interface
  mountSync(mountpoint: string, json: DirectoryJSON) {
    this.fromJSON(json, { mountpoint: mountpoint });
  }

  openLink(link: Link, flagsNum: number, resolveSymlinks: boolean = true): File {
    if (this.openFiles >= this.maxFiles) {
      // Too many open files.
      throw createError(ERROR_CODE.EMFILE, 'open', link.getPath());
    }

    // Resolve symlinks.
    //
    // @TODO: This should be superfluous. This method is only ever called by openFile(), which does its own symlink resolution
    // prior to calling.
    let realLink: Link | null = link;
    if (resolveSymlinks) realLink = this.getResolvedLinkOrThrow(link.getPath(), 'open');

    const node = realLink.getNode();

    // Check whether node is a directory
    if (node.isDirectory()) {
      if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY)
        throw createError(ERROR_CODE.EISDIR, 'open', link.getPath());
    } else {
      if (flagsNum & O_DIRECTORY) throw createError(ERROR_CODE.ENOTDIR, 'open', link.getPath());
    }

    // Check node permissions
    // For read access: check if flags are O_RDONLY or O_RDWR (i.e., not only O_WRONLY)
    if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_WRONLY) {
      if (!node.canRead()) {
        throw createError(ERROR_CODE.EACCES, 'open', link.getPath());
      }
    }
    // For write access: check if flags are O_WRONLY or O_RDWR
    if (flagsNum & (O_WRONLY | O_RDWR)) {
      if (!node.canWrite()) {
        throw createError(ERROR_CODE.EACCES, 'open', link.getPath());
      }
    }

    const file = new File(link, node, flagsNum, this.newFdNumber());
    this.fds[file.fd] = file;
    this.openFiles++;

    if (flagsNum & O_TRUNC) file.truncate();

    return file;
  }

  protected openFile(
    filename: string,
    flagsNum: number,
    modeNum: number | undefined,
    resolveSymlinks: boolean = true,
  ): File {
    const steps = filenameToSteps(filename, this.cwd);
    let link: Link | null;
    try {
      link = resolveSymlinks ? this.getResolvedLinkOrThrow(filename, 'open') : this.getLinkOrThrow(filename, 'open');

      // Check if file already existed when trying to create it exclusively (O_CREAT and O_EXCL flags are set).
      // This is an error, see https://pubs.opengroup.org/onlinepubs/009695399/functions/open.html:
      // "If O_CREAT and O_EXCL are set, open() shall fail if the file exists."
      if (link && flagsNum & O_CREAT && flagsNum & O_EXCL) throw createError(ERROR_CODE.EEXIST, 'open', filename);
    } catch (err) {
      // Try creating a new file, if it does not exist and O_CREAT flag is set.
      // Note that this will still throw if the ENOENT came from one of the
      // intermediate directories instead of the file itself.
      if (err.code === ERROR_CODE.ENOENT && flagsNum & O_CREAT) {
        const dirName = dirname(filename);
        const dirLink = this.getResolvedLinkOrThrow(dirName);
        const dirNode = dirLink.getNode();

        // Check that the place we create the new file is actually a directory and that we are allowed to do so:
        if (!dirNode.isDirectory()) throw createError(ERROR_CODE.ENOTDIR, 'open', filename);
        if (!dirNode.canExecute() || !dirNode.canWrite()) throw createError(ERROR_CODE.EACCES, 'open', filename);

        // This is a difference to the original implementation, which would simply not create a file unless modeNum was specified.
        // However, current Node versions will default to 0o666.
        modeNum ??= 0o666;

        link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
      } else throw err;
    }

    if (link) return this.openLink(link, flagsNum, resolveSymlinks);
    throw createError(ERROR_CODE.ENOENT, 'open', filename);
  }

  public readonly open = (
    filename: string,
    flagsNum: number,
    modeNum: number,
    resolveSymlinks: boolean = true,
  ): number => {
    const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
    if (!file) throw createError(ERROR_CODE.ENOENT, 'open', filename);
    return file.fd;
  };

  public readonly writeFile = (id: TFileId, buf: Buffer, flagsNum: number, modeNum: number) => {
    const isUserFd = typeof id === 'number';
    let fd: number;
    if (isUserFd) fd = id as number;
    else fd = this.open(pathToFilename(id as PathLike), flagsNum, modeNum);
    let offset = 0;
    let length = buf.length;
    let position = flagsNum & O_APPEND ? undefined : 0;
    try {
      while (length > 0) {
        const written = this.write(fd, buf, offset, length, position);
        offset += written;
        length -= written;
        if (position !== undefined) position += written;
      }
    } finally {
      if (!isUserFd) this.close(fd);
    }
  };

  public readonly read = (
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
  ): number => {
    if (buffer.byteLength < length) {
      throw createError(ERROR_CODE.ERR_OUT_OF_RANGE, 'read', undefined, undefined, RangeError);
    }
    const file = this.getFileByFdOrThrow(fd);
    if (file.node.isSymlink()) {
      throw createError(ERROR_CODE.EPERM, 'read', file.link.getPath());
    }
    return file.read(
      buffer,
      Number(offset),
      Number(length),
      position === -1 || typeof position !== 'number' ? undefined : position,
    );
  };

  public readonly readv = (fd: number, buffers: ArrayBufferView[], position: number | null): number => {
    const file = this.getFileByFdOrThrow(fd);
    let p = position ?? undefined;
    if (p === -1) p = undefined;
    let bytesRead = 0;
    for (const buffer of buffers) {
      const bytes = file.read(buffer, 0, buffer.byteLength, p);
      p = undefined;
      bytesRead += bytes;
      if (bytes < buffer.byteLength) break;
    }
    return bytesRead;
  };

  public readonly link = (filename1: string, filename2: string) => {
    let link1: Link;
    try {
      link1 = this.getLinkOrThrow(filename1, 'link');
    } catch (err) {
      if (err.code) err = createError(err.code, 'link', filename1, filename2);
      throw err;
    }
    const dirname2 = dirname(filename2);
    let dir2: Link;
    try {
      dir2 = this.getLinkOrThrow(dirname2, 'link');
    } catch (err) {
      // Augment error with filename1
      if (err.code) err = createError(err.code, 'link', filename1, filename2);
      throw err;
    }
    const name = basename(filename2);
    if (dir2.getChild(name)) throw createError(ERROR_CODE.EEXIST, 'link', filename1, filename2);
    const node = link1.getNode();
    node.nlink++;
    dir2.createChild(name, node);
  };

  public readonly unlink = (filename: string) => {
    const link: Link = this.getLinkOrThrow(filename, 'unlink');
    // TODO: Check if it is file, dir, other...
    if (link.length) throw Error('Dir not empty...');
    this.deleteLink(link);
    const node = link.getNode();
    node.nlink--;
    // When all hard links to i-node are deleted, remove the i-node, too.
    if (node.nlink <= 0) {
      this.deleteNode(node);
    }
  };

  public readonly symlink = (targetFilename: string, pathFilename: string): Link => {
    const pathSteps = filenameToSteps(pathFilename, this.cwd);
    // Check if directory exists, where we about to create a symlink.
    let dirLink;
    try {
      dirLink = this.getLinkParentAsDirOrThrow(pathSteps);
    } catch (err) {
      // Catch error to populate with the correct fields - getLinkParentAsDirOrThrow won't be aware of the second path
      if (err.code) err = createError(err.code, 'symlink', targetFilename, pathFilename);
      throw err;
    }
    const name = pathSteps[pathSteps.length - 1];
    // Check if new file already exists.
    if (dirLink.getChild(name)) throw createError(ERROR_CODE.EEXIST, 'symlink', targetFilename, pathFilename);
    // Check permissions on the path where we are creating the symlink.
    // Note we're not checking permissions on the target path: It is not an error to create a symlink to a
    // non-existent or inaccessible target
    const node = dirLink.getNode();
    if (!node.canExecute() || !node.canWrite())
      throw createError(ERROR_CODE.EACCES, 'symlink', targetFilename, pathFilename);
    // Create symlink.
    const symlink: Link = dirLink.createChild(name);
    symlink.getNode().makeSymlink(targetFilename);
    return symlink;
  };

  public readonly rename = (oldPathFilename: string, newPathFilename: string) => {
    let link: Link;
    try {
      link = this.getResolvedLinkOrThrow(oldPathFilename);
    } catch (err) {
      // Augment err with newPathFilename
      if (err.code) err = createError(err.code, 'rename', oldPathFilename, newPathFilename);
      throw err;
    }

    // TODO: Check if it is directory, if non-empty, we cannot move it, right?

    // Check directory exists for the new location.
    let newPathDirLink: Link;
    try {
      newPathDirLink = this.getLinkParentAsDirOrThrow(newPathFilename);
    } catch (err) {
      // Augment error with oldPathFilename
      if (err.code) err = createError(err.code, 'rename', oldPathFilename, newPathFilename);
      throw err;
    }

    // TODO: Also treat cases with directories and symbolic links.
    // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html

    // Remove hard link from old folder.
    const oldLinkParent = link.parent;
    if (!oldLinkParent) throw createError(ERROR_CODE.EINVAL, 'rename', oldPathFilename, newPathFilename);

    // Check we have access and write permissions in both places
    const oldParentNode: Node = oldLinkParent.getNode();
    const newPathDirNode: Node = newPathDirLink.getNode();
    if (
      !oldParentNode.canExecute() ||
      !oldParentNode.canWrite() ||
      !newPathDirNode.canExecute() ||
      !newPathDirNode.canWrite()
    ) {
      throw createError(ERROR_CODE.EACCES, 'rename', oldPathFilename, newPathFilename);
    }

    oldLinkParent.deleteChild(link);

    // Rename should overwrite the new path, if that exists.
    const name = basename(newPathFilename);
    link.name = name;
    link.steps = [...newPathDirLink.steps, name];
    newPathDirLink.setChild(link.getName(), link);
  };

  public readonly mkdir = (filename: string, modeNum: number): void => {
    const steps = filenameToSteps(filename, this.cwd);
    // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
    if (!steps.length) throw createError(ERROR_CODE.EEXIST, 'mkdir', filename);
    const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');
    // Check path already exists.
    const name = steps[steps.length - 1];
    if (dir.getChild(name)) throw createError(ERROR_CODE.EEXIST, 'mkdir', filename);
    const node = dir.getNode();
    if (!node.canWrite() || !node.canExecute()) throw createError(ERROR_CODE.EACCES, 'mkdir', filename);
    dir.createChild(name, this.createNode(constants.S_IFDIR | modeNum));
  };

  /**
   * Creates directory tree recursively.
   */
  public readonly mkdirp = (filename: string, modeNum: number): string | undefined => {
    let created = false;
    const steps = filenameToSteps(filename, this.cwd);
    let curr: Link | null = null;
    let i = steps.length;
    // Find the longest subpath of filename that still exists:
    for (i = steps.length; i >= 0; i--) {
      curr = this.getResolvedLink(steps.slice(0, i));
      if (curr) break;
    }
    if (!curr) {
      curr = this.root;
      i = 0;
    }
    // curr is now the last directory that still exists.
    // (If none of them existed, curr is the root.)
    // Check access the lazy way:
    curr = this.getResolvedLinkOrThrow(sep + steps.slice(0, i).join(sep), 'mkdir');
    // Start creating directories:
    for (i; i < steps.length; i++) {
      const node = curr.getNode();
      if (node.isDirectory()) {
        // Check we have permissions
        if (!node.canExecute() || !node.canWrite()) throw createError(ERROR_CODE.EACCES, 'mkdir', filename);
      } else {
        throw createError(ERROR_CODE.ENOTDIR, 'mkdir', filename);
      }
      created = true;
      curr = curr.createChild(steps[i], this.createNode(constants.S_IFDIR | modeNum));
    }
    return created ? filename : undefined;
  };

  public readonly rmdir = (filename: string, recursive: boolean = false) => {
    const link = this.getLinkAsDirOrThrow(filename, 'rmdir');
    if (link.length && !recursive) throw createError(ERROR_CODE.ENOTEMPTY, 'rmdir', filename);
    this.deleteLink(link);
  };

  public readonly rm = (filename: string, force: boolean = false, recursive: boolean = false): void => {
    // "stat" is used to match Node's native error message.
    let link: Link;
    try {
      link = this.getResolvedLinkOrThrow(filename, 'stat');
    } catch (err) {
      // Silently ignore missing paths if force option is true
      if (err.code === ERROR_CODE.ENOENT && force) return;
      else throw err;
    }
    if (link.getNode().isDirectory() && !recursive) throw createError(ERROR_CODE.ERR_FS_EISDIR, 'rm', filename);
    if (!link.parent?.getNode().canWrite()) throw createError(ERROR_CODE.EACCES, 'rm', filename);
    this.deleteLink(link);
  };

  protected closeFile(file: File) {
    if (!this.fds[file.fd]) return;
    this.openFiles--;
    delete this.fds[file.fd];
    this.releasedFds.push(file.fd);
  }

  public readonly close = (fd: number) => {
    validateFd(fd);
    const file = this.getFileByFdOrThrow(fd, 'close');
    this.closeFile(file);
  };

  write(fd: number, buf: Buffer, offset?: number, length?: number, position?: number | null): number {
    const file = this.getFileByFdOrThrow(fd, 'write');
    if (file.node.isSymlink()) {
      throw createError(ERROR_CODE.EBADF, 'write', file.link.getPath());
    }
    return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
  }
}
