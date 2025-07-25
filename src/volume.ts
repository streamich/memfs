import * as pathModule from 'path';
import { Node, Link, File } from './node';
import Stats from './Stats';
import Dirent from './Dirent';
import { Buffer, bufferAllocUnsafe, bufferFrom } from './internal/buffer';
import queueMicrotask from './queueMicrotask';
import process from './process';
import setTimeoutUnref, { TSetTimeout } from './setTimeoutUnref';
import { Readable, Writable } from 'stream';
import { constants } from './constants';
import { EventEmitter } from 'events';
import { TEncodingExtended, TDataOut, strToEncoding, ENCODING_UTF8 } from './encoding';
import { FileHandle } from './node/FileHandle';
import * as util from 'util';
import * as misc from './node/types/misc';
import * as opts from './node/types/options';
import { FsCallbackApi, WritevCallback } from './node/types/FsCallbackApi';
import { FsPromises } from './node/FsPromises';
import { ToTreeOptions, toTreeSync } from './print';
import { ERRSTR, FLAGS, MODE } from './node/constants';
import {
  getDefaultOpts,
  getDefaultOptsAndCb,
  getMkdirOptions,
  getOptions,
  getReadFileOptions,
  getReaddirOptions,
  getReaddirOptsAndCb,
  getRmOptsAndCb,
  getRmdirOptions,
  optsAndCbGenerator,
  getAppendFileOptsAndCb,
  getAppendFileOpts,
  getStatOptsAndCb,
  getStatOptions,
  getRealpathOptsAndCb,
  getRealpathOptions,
  getWriteFileOptions,
  writeFileDefaults,
  getOpendirOptsAndCb,
  getOpendirOptions,
} from './node/options';
import {
  validateCallback,
  modeToNumber,
  pathToFilename,
  nullCheck,
  createError,
  genRndStr6,
  flagsToNumber,
  validateFd,
  isFd,
  isWin,
  dataToBuffer,
  getWriteArgs,
  bufferToEncoding,
  getWriteSyncArgs,
  unixify,
} from './node/util';
import type { PathLike, symlink } from './node/types/misc';
import type { FsPromisesApi, FsSynchronousApi } from './node/types';
import { Dir } from './Dir';

const resolveCrossPlatform = pathModule.resolve;
const {
  O_RDONLY,
  O_WRONLY,
  O_RDWR,
  O_CREAT,
  O_EXCL,
  O_TRUNC,
  O_APPEND,
  O_DIRECTORY,
  O_SYMLINK,
  F_OK,
  COPYFILE_EXCL,
  COPYFILE_FICLONE_FORCE,
} = constants;

const { sep, relative, join, dirname } = pathModule.posix ? pathModule.posix : pathModule;

// ---------------------------------------- Types

// Node-style errors with a `code` property.
export interface IError extends Error {
  code?: string;
}

export type TFileId = PathLike | number; // Number is used as a file descriptor.
export type TData = TDataOut | ArrayBufferView | DataView; // Data formats users can give us.
export type TFlags = string | number;
export type TMode = string | number; // Mode can be a String, although docs say it should be a Number.
export type TTime = number | string | Date;
export type TCallback<TData> = (error?: IError | null, data?: TData) => void;

// ---------------------------------------- Constants

const kMinPoolSpace = 128;

// ---------------------------------------- Error messages

const EPERM = 'EPERM';
const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';
const ENOSYS = 'ENOSYS';
const ERR_FS_EISDIR = 'ERR_FS_EISDIR';
const ERR_OUT_OF_RANGE = 'ERR_OUT_OF_RANGE';

// ---------------------------------------- Flags

export type TFlagsCopy =
  | typeof constants.COPYFILE_EXCL
  | typeof constants.COPYFILE_FICLONE
  | typeof constants.COPYFILE_FICLONE_FORCE;

// ---------------------------------------- Options

// Options for `fs.appendFile` and `fs.appendFileSync`
export interface IAppendFileOptions extends opts.IFileOptions {}

// Options for `fs.watchFile`
export interface IWatchFileOptions {
  persistent?: boolean;
  interval?: number;
}

// Options for `fs.watch`
export interface IWatchOptions extends opts.IOptions {
  persistent?: boolean;
  recursive?: boolean;
}

// ---------------------------------------- Utility functions

type TResolve = (filename: string, base?: string) => string;
let resolve: TResolve = (filename, base = process.cwd()) => resolveCrossPlatform(base, filename);
if (isWin) {
  const _resolve = resolve;
  resolve = (filename, base) => unixify(_resolve(filename, base));
}

export function filenameToSteps(filename: string, base?: string): string[] {
  const fullPath = resolve(filename, base);
  const fullPathSansSlash = fullPath.substring(1);
  if (!fullPathSansSlash) return [];
  return fullPathSansSlash.split(sep);
}

export function pathToSteps(path: PathLike): string[] {
  return filenameToSteps(pathToFilename(path));
}

export function dataToStr(data: TData, encoding: string = ENCODING_UTF8): string {
  if (Buffer.isBuffer(data)) return data.toString(encoding);
  else if (data instanceof Uint8Array) return bufferFrom(data).toString(encoding);
  else return String(data);
}

// converts Date or number to a fractional UNIX timestamp
export function toUnixTimestamp(time) {
  // tslint:disable-next-line triple-equals
  if (typeof time === 'string' && +time == (time as any)) {
    return +time;
  }
  if (time instanceof Date) {
    return time.getTime() / 1000;
  }
  if (isFinite(time)) {
    if (time < 0) {
      return Date.now() / 1000;
    }
    return time;
  }
  throw new Error('Cannot parse time: ' + time);
}

function validateUid(uid: number) {
  if (typeof uid !== 'number') throw TypeError(ERRSTR.UID);
}

function validateGid(gid: number) {
  if (typeof gid !== 'number') throw TypeError(ERRSTR.GID);
}

// ---------------------------------------- Volume
type DirectoryContent = string | Buffer | null;

export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T;
}
export interface NestedDirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T | NestedDirectoryJSON;
}

function flattenJSON(nestedJSON: NestedDirectoryJSON): DirectoryJSON {
  const flatJSON: DirectoryJSON = {};

  function flatten(pathPrefix: string, node: NestedDirectoryJSON) {
    for (const path in node) {
      const contentOrNode = node[path];

      const joinedPath = join(pathPrefix, path);

      if (typeof contentOrNode === 'string' || contentOrNode instanceof Buffer) {
        flatJSON[joinedPath] = contentOrNode;
      } else if (typeof contentOrNode === 'object' && contentOrNode !== null && Object.keys(contentOrNode).length > 0) {
        // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered

        flatten(joinedPath, contentOrNode);
      } else {
        // without this branch null, empty-object or non-object entries would not be handled in the same way
        // by both fromJSON() and fromNestedJSON()
        flatJSON[joinedPath] = null;
      }
    }
  }

  flatten('', nestedJSON);

  return flatJSON;
}

const notImplemented: (...args: any[]) => any = () => {
  throw new Error('Not implemented');
};

/**
 * `Volume` represents a file system.
 */
export class Volume implements FsCallbackApi, FsSynchronousApi {
  static fromJSON(json: DirectoryJSON, cwd?: string): Volume {
    const vol = new Volume();
    vol.fromJSON(json, cwd);
    return vol;
  }

  static fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): Volume {
    const vol = new Volume();
    vol.fromNestedJSON(json, cwd);
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

  StatWatcher: new () => StatWatcher;
  ReadStream: new (...args) => misc.IReadStream;
  WriteStream: new (...args) => IWriteStream;
  FSWatcher: new () => FSWatcher;

  props: {
    Node: new (...args) => Node;
    Link: new (...args) => Link;
    File: new (...args) => File;
  };

  private promisesApi = new FsPromises(this, FileHandle);

  get promises(): FsPromisesApi {
    if (this.promisesApi === null) throw new Error('Promise is not supported in this environment.');
    return this.promisesApi;
  }

  constructor(props = {}) {
    this.props = Object.assign({ Node, Link, File }, props);

    const root = this.createLink();
    root.setNode(this.createNode(constants.S_IFDIR | 0o777));

    const self = this; // tslint:disable-line no-this-assignment

    this.StatWatcher = class extends StatWatcher {
      constructor() {
        super(self);
      }
    };

    const _ReadStream: new (...args) => misc.IReadStream = FsReadStream as any;
    this.ReadStream = class extends _ReadStream {
      constructor(...args) {
        super(self, ...args);
      }
    } as any as new (...args) => misc.IReadStream;

    const _WriteStream: new (...args) => IWriteStream = FsWriteStream as any;
    this.WriteStream = class extends _WriteStream {
      constructor(...args) {
        super(self, ...args);
      }
    } as any as new (...args) => IWriteStream;

    this.FSWatcher = class extends FSWatcher {
      constructor() {
        super(self);
      }
    };

    root.setChild('.', root);
    root.getNode().nlink++;

    root.setChild('..', root);
    root.getNode().nlink++;

    this.root = root;
  }

  createLink(): Link;
  createLink(parent: Link, name: string, isDirectory?: boolean, mode?: number): Link;
  createLink(parent?: Link, name?: string, isDirectory: boolean = false, mode?: number): Link {
    if (!parent) {
      return new this.props.Link(this, null, '');
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
    return typeof releasedFd === 'number' ? releasedFd : Volume.fd--;
  }

  createNode(mode: number): Node {
    const node = new this.props.Node(this.newInoNumber(), mode);
    this.inodes[node.ino] = node;
    return node;
  }

  private deleteNode(node: Node) {
    node.del();
    delete this.inodes[node.ino];
    this.releasedInos.push(node.ino);
  }

  private walk(
    steps: string[],
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Link | null;
  private walk(
    filename: string,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Link | null;
  private walk(
    link: Link,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Link | null;
  private walk(
    stepsOrFilenameOrLink: string[] | string | Link,
    resolveSymlinks: boolean,
    checkExistence: boolean,
    checkAccess: boolean,
    funcName?: string,
  ): Link | null;
  private walk(
    stepsOrFilenameOrLink: string[] | string | Link,
    resolveSymlinks: boolean = false,
    checkExistence: boolean = false,
    checkAccess: boolean = false,
    funcName?: string,
  ): Link | null {
    let steps: string[];
    let filename: string;
    if (stepsOrFilenameOrLink instanceof Link) {
      steps = stepsOrFilenameOrLink.steps;
      filename = sep + steps.join(sep);
    } else if (typeof stepsOrFilenameOrLink === 'string') {
      steps = filenameToSteps(stepsOrFilenameOrLink);
      filename = stepsOrFilenameOrLink;
    } else {
      steps = stepsOrFilenameOrLink;
      filename = sep + steps.join(sep);
    }

    let curr: Link | null = this.root;
    let i = 0;
    while (i < steps.length) {
      let node: Node = curr.getNode();
      // Check access permissions if current link is a directory
      if (node.isDirectory()) {
        if (checkAccess && !node.canExecute()) {
          throw createError(EACCES, funcName, filename);
        }
      } else {
        if (i < steps.length - 1) throw createError(ENOTDIR, funcName, filename);
      }

      curr = curr.getChild(steps[i]) ?? null;

      // Check existence of current link
      if (!curr)
        if (checkExistence) throw createError(ENOENT, funcName, filename);
        else return null;

      node = curr?.getNode();
      // Resolve symlink
      if (resolveSymlinks && node.isSymlink()) {
        const resolvedPath = pathModule.isAbsolute(node.symlink)
          ? node.symlink
          : join(pathModule.dirname(curr.getPath()), node.symlink); // Relative to symlink's parent

        steps = filenameToSteps(resolvedPath).concat(steps.slice(i + 1));
        curr = this.root;
        i = 0;
        continue;
      }

      i++;
    }

    return curr;
  }

  // Returns a `Link` (hard link) referenced by path "split" into steps.
  getLink(steps: string[]): Link | null {
    return this.walk(steps, false, false, false);
  }

  // Just link `getLink`, but throws a correct user error, if link to found.
  getLinkOrThrow(filename: string, funcName?: string): Link {
    return this.walk(filename, false, true, true, funcName)!;
  }

  // Just like `getLink`, but also dereference/resolves symbolic links.
  getResolvedLink(filenameOrSteps: string | string[]): Link | null {
    return this.walk(filenameOrSteps, true, false, false);
  }

  // Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
  getResolvedLinkOrThrow(filename: string, funcName?: string): Link {
    return this.walk(filename, true, true, true, funcName)!;
  }

  resolveSymlinks(link: Link): Link | null {
    return this.getResolvedLink(link.steps.slice(1));
  }

  // Just like `getLinkOrThrow`, but also verifies that the link is a directory.
  private getLinkAsDirOrThrow(filename: string, funcName?: string): Link {
    const link = this.getLinkOrThrow(filename, funcName)!;
    if (!link.getNode().isDirectory()) throw createError(ENOTDIR, funcName, filename);
    return link;
  }

  // Get the immediate parent directory of the link.
  private getLinkParent(steps: string[]): Link | null {
    return this.getLink(steps.slice(0, -1));
  }

  private getLinkParentAsDirOrThrow(filenameOrSteps: string | string[], funcName?: string): Link {
    const steps: string[] = (
      filenameOrSteps instanceof Array ? filenameOrSteps : filenameToSteps(filenameOrSteps)
    ).slice(0, -1);
    const filename: string = sep + steps.join(sep);
    const link = this.getLinkOrThrow(filename, funcName);
    if (!link.getNode().isDirectory()) throw createError(ENOTDIR, funcName, filename);
    return link;
  }

  private getFileByFd(fd: number): File {
    return this.fds[String(fd)];
  }

  private getFileByFdOrThrow(fd: number, funcName?: string): File {
    if (!isFd(fd)) throw TypeError(ERRSTR.FD);
    const file = this.getFileByFd(fd);
    if (!file) throw createError(EBADF, funcName);
    return file;
  }

  /**
   * @todo This is not used anymore. Remove.
   */
  /*
  private getNodeByIdOrCreate(id: TFileId, flags: number, perm: number): Node {
    if (typeof id === 'number') {
      const file = this.getFileByFd(id);
      if (!file) throw Error('File nto found');
      return file.node;
    } else {
      const steps = pathToSteps(id as PathLike);
      let link = this.getLink(steps);
      if (link) return link.getNode();

      // Try creating a node if not found.
      if (flags & O_CREAT) {
        const dirLink = this.getLinkParent(steps);
        if (dirLink) {
          const name = steps[steps.length - 1];
          link = this.createLink(dirLink, name, false, perm);
          return link.getNode();
        }
      }

      throw createError(ENOENT, 'getNodeByIdOrCreate', pathToFilename(id));
    }
  }
  */

  private wrapAsync(method: (...args) => void, args: any[], callback: TCallback<any>) {
    validateCallback(callback);
    Promise.resolve().then(() => {
      let result;
      try {
        result = method.apply(this, args);
      } catch (err) {
        callback(err);
        return;
      }
      callback(null, result);
    });
  }

  private _toJSON(link = this.root, json = {}, path?: string, asBuffer?: boolean): DirectoryJSON<string | null> {
    let isEmpty = true;

    let children = link.children;

    if (link.getNode().isFile()) {
      children = new Map([[link.getName(), link.parent.getChild(link.getName())]]);
      link = link.parent;
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
        if (path) filename = relative(path, filename);
        json[filename] = asBuffer ? node.getBuffer() : node.getString();
      } else if (node.isDirectory()) {
        this._toJSON(child, json, path, asBuffer);
      }
    }

    let dirPath = link.getPath();

    if (path) dirPath = relative(path, dirPath);

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

  // TODO: `cwd` should probably not invoke `process.cwd()`.
  fromJSON(json: DirectoryJSON, cwd: string = process.cwd()) {
    for (let filename in json) {
      const data = json[filename];

      filename = resolve(filename, cwd);

      if (typeof data === 'string' || data instanceof Buffer) {
        const dir = dirname(filename);
        this.mkdirpBase(dir, MODE.DIR);

        this.writeFileSync(filename, data);
      } else {
        this.mkdirpBase(filename, MODE.DIR);
      }
    }
  }

  fromNestedJSON(json: NestedDirectoryJSON, cwd?: string) {
    this.fromJSON(flattenJSON(json), cwd);
  }

  public toTree(opts: ToTreeOptions = { separator: <'/' | '\\'>sep }): string {
    return toTreeSync(this, opts);
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
    this.fromJSON(json, mountpoint);
  }

  private openLink(link: Link, flagsNum: number, resolveSymlinks: boolean = true): File {
    if (this.openFiles >= this.maxFiles) {
      // Too many open files.
      throw createError(EMFILE, 'open', link.getPath());
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
      if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY) throw createError(EISDIR, 'open', link.getPath());
    } else {
      if (flagsNum & O_DIRECTORY) throw createError(ENOTDIR, 'open', link.getPath());
    }

    // Check node permissions
    if (!(flagsNum & O_WRONLY)) {
      if (!node.canRead()) {
        throw createError(EACCES, 'open', link.getPath());
      }
    }
    if (!(flagsNum & O_RDONLY)) {
      if (!node.canWrite()) {
        throw createError(EACCES, 'open', link.getPath());
      }
    }

    const file = new this.props.File(link, node, flagsNum, this.newFdNumber());
    this.fds[file.fd] = file;
    this.openFiles++;

    if (flagsNum & O_TRUNC) file.truncate();

    return file;
  }

  private openFile(
    filename: string,
    flagsNum: number,
    modeNum: number | undefined,
    resolveSymlinks: boolean = true,
  ): File {
    const steps = filenameToSteps(filename);
    let link: Link | null;
    try {
      link = resolveSymlinks ? this.getResolvedLinkOrThrow(filename, 'open') : this.getLinkOrThrow(filename, 'open');

      // Check if file already existed when trying to create it exclusively (O_CREAT and O_EXCL flags are set).
      // This is an error, see https://pubs.opengroup.org/onlinepubs/009695399/functions/open.html:
      // "If O_CREAT and O_EXCL are set, open() shall fail if the file exists."
      if (link && flagsNum & O_CREAT && flagsNum & O_EXCL) throw createError(EEXIST, 'open', filename);
    } catch (err) {
      // Try creating a new file, if it does not exist and O_CREAT flag is set.
      // Note that this will still throw if the ENOENT came from one of the
      // intermediate directories instead of the file itself.
      if (err.code === ENOENT && flagsNum & O_CREAT) {
        const dirname: string = pathModule.dirname(filename);
        const dirLink: Link = this.getResolvedLinkOrThrow(dirname);
        const dirNode = dirLink.getNode();

        // Check that the place we create the new file is actually a directory and that we are allowed to do so:
        if (!dirNode.isDirectory()) throw createError(ENOTDIR, 'open', filename);
        if (!dirNode.canExecute() || !dirNode.canWrite()) throw createError(EACCES, 'open', filename);

        // This is a difference to the original implementation, which would simply not create a file unless modeNum was specified.
        // However, current Node versions will default to 0o666.
        modeNum ??= 0o666;

        link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
      } else throw err;
    }

    if (link) return this.openLink(link, flagsNum, resolveSymlinks);
    throw createError(ENOENT, 'open', filename);
  }

  private openBase(filename: string, flagsNum: number, modeNum: number, resolveSymlinks: boolean = true): number {
    const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
    if (!file) throw createError(ENOENT, 'open', filename);
    return file.fd;
  }

  openSync(path: PathLike, flags: TFlags, mode: TMode = MODE.DEFAULT): number {
    // Validate (1) mode; (2) path; (3) flags - in that order.
    const modeNum = modeToNumber(mode);
    const fileName = pathToFilename(path);
    const flagsNum = flagsToNumber(flags);
    return this.openBase(fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK));
  }

  open(path: PathLike, flags: TFlags, /* ... */ callback: TCallback<number>);
  open(path: PathLike, flags: TFlags, mode: TMode, callback: TCallback<number>);
  open(path: PathLike, flags: TFlags, a: TMode | TCallback<number>, b?: TCallback<number>) {
    let mode: TMode = a as TMode;
    let callback: TCallback<number> = b as TCallback<number>;

    if (typeof a === 'function') {
      mode = MODE.DEFAULT;
      callback = a;
    }
    mode = mode || MODE.DEFAULT;

    const modeNum = modeToNumber(mode);
    const fileName = pathToFilename(path);
    const flagsNum = flagsToNumber(flags);

    this.wrapAsync(this.openBase, [fileName, flagsNum, modeNum, !(flagsNum & O_SYMLINK)], callback);
  }

  private closeFile(file: File) {
    if (!this.fds[file.fd]) return;

    this.openFiles--;
    delete this.fds[file.fd];
    this.releasedFds.push(file.fd);
  }

  closeSync(fd: number) {
    validateFd(fd);
    const file = this.getFileByFdOrThrow(fd, 'close');
    this.closeFile(file);
  }

  close(fd: number, callback: TCallback<void>) {
    validateFd(fd);
    const file = this.getFileByFdOrThrow(fd, 'close');
    // NOTE: not calling closeSync because we can reset in between close and closeSync
    this.wrapAsync(this.closeFile, [file], callback);
  }

  private openFileOrGetById(id: TFileId, flagsNum: number, modeNum?: number): File {
    if (typeof id === 'number') {
      const file = this.fds[id];
      if (!file) throw createError(ENOENT);
      return file;
    } else {
      return this.openFile(pathToFilename(id), flagsNum, modeNum);
    }
  }

  private readBase(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
  ): number {
    if (buffer.byteLength < length) {
      throw createError(ERR_OUT_OF_RANGE, 'read', undefined, undefined, RangeError);
    }
    const file = this.getFileByFdOrThrow(fd);
    if (file.node.isSymlink()) {
      throw createError(EPERM, 'read', file.link.getPath());
    }
    return file.read(
      buffer,
      Number(offset),
      Number(length),
      position === -1 || typeof position !== 'number' ? undefined : position,
    );
  }

  readSync(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
  ): number {
    validateFd(fd);
    return this.readBase(fd, buffer, offset, length, position);
  }

  read(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number | null,
    callback: (err?: Error | null, bytesRead?: number, buffer?: Buffer | ArrayBufferView | DataView) => void,
  ) {
    validateCallback(callback);

    // This `if` branch is from Node.js
    if (length === 0) {
      return queueMicrotask(() => {
        if (callback) callback(null, 0, buffer);
      });
    }

    Promise.resolve().then(() => {
      try {
        const bytes = this.readBase(fd, buffer, offset, length, position);
        callback(null, bytes, buffer);
      } catch (err) {
        callback(err);
      }
    });
  }

  private readvBase(fd: number, buffers: ArrayBufferView[], position: number | null): number {
    const file = this.getFileByFdOrThrow(fd);
    let p = position ?? undefined;
    if (p === -1) {
      p = undefined;
    }
    let bytesRead = 0;
    for (const buffer of buffers) {
      const bytes = file.read(buffer, 0, buffer.byteLength, p);
      p = undefined;
      bytesRead += bytes;
      if (bytes < buffer.byteLength) break;
    }
    return bytesRead;
  }

  readv(fd: number, buffers: ArrayBufferView[], callback: misc.TCallback2<number, ArrayBufferView[]>): void;
  readv(
    fd: number,
    buffers: ArrayBufferView[],
    position: number | null,
    callback: misc.TCallback2<number, ArrayBufferView[]>,
  ): void;
  readv(
    fd: number,
    buffers: ArrayBufferView[],
    a: number | null | misc.TCallback2<number, ArrayBufferView[]>,
    b?: misc.TCallback2<number, ArrayBufferView[]>,
  ): void {
    let position: number | null = a as number | null;
    let callback: misc.TCallback2<number, ArrayBufferView[]> = b as misc.TCallback2<number, ArrayBufferView[]>;

    if (typeof a === 'function') {
      position = null;
      callback = a;
    }

    validateCallback(callback);

    Promise.resolve().then(() => {
      try {
        const bytes = this.readvBase(fd, buffers, position);
        callback(null, bytes, buffers);
      } catch (err) {
        callback(err);
      }
    });
  }

  readvSync(fd: number, buffers: ArrayBufferView[], position: number | null): number {
    validateFd(fd);
    return this.readvBase(fd, buffers, position);
  }

  private readFileBase(id: TFileId, flagsNum: number, encoding: BufferEncoding): Buffer | string {
    let result: Buffer | string;

    const isUserFd = typeof id === 'number';
    const userOwnsFd: boolean = isUserFd && isFd(id);
    let fd: number;

    if (userOwnsFd) fd = id as number;
    else {
      const filename = pathToFilename(id as PathLike);
      const link: Link = this.getResolvedLinkOrThrow(filename, 'open');

      const node = link.getNode();
      if (node.isDirectory()) throw createError(EISDIR, 'open', link.getPath());

      fd = this.openSync(id as PathLike, flagsNum);
    }

    try {
      result = bufferToEncoding(this.getFileByFdOrThrow(fd).getBuffer(), encoding);
    } finally {
      if (!userOwnsFd) {
        this.closeSync(fd);
      }
    }

    return result;
  }

  readFileSync(file: TFileId, options?: opts.IReadFileOptions | string): TDataOut {
    const opts = getReadFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    return this.readFileBase(file, flagsNum, opts.encoding as BufferEncoding);
  }

  readFile(id: TFileId, callback: TCallback<TDataOut>);
  readFile(id: TFileId, options: opts.IReadFileOptions | string, callback: TCallback<TDataOut>);
  readFile(id: TFileId, a: TCallback<TDataOut> | opts.IReadFileOptions | string, b?: TCallback<TDataOut>) {
    const [opts, callback] = optsAndCbGenerator<opts.IReadFileOptions, TCallback<TDataOut>>(getReadFileOptions)(a, b);
    const flagsNum = flagsToNumber(opts.flag);
    this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
  }

  private writeBase(fd: number, buf: Buffer, offset?: number, length?: number, position?: number | null): number {
    const file = this.getFileByFdOrThrow(fd, 'write');
    if (file.node.isSymlink()) {
      throw createError(EBADF, 'write', file.link.getPath());
    }
    return file.write(buf, offset, length, position === -1 || typeof position !== 'number' ? undefined : position);
  }

  writeSync(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset?: number,
    length?: number,
    position?: number,
  ): number;
  writeSync(fd: number, str: string, position?: number, encoding?: BufferEncoding): number;
  writeSync(
    fd: number,
    a: string | Buffer | ArrayBufferView | DataView,
    b?: number,
    c?: number | BufferEncoding,
    d?: number,
  ): number {
    const [, buf, offset, length, position] = getWriteSyncArgs(fd, a, b, c, d);
    return this.writeBase(fd, buf, offset, length, position);
  }

  write(fd: number, buffer: Buffer | ArrayBufferView | DataView, callback: (...args) => void);
  write(fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, callback: (...args) => void);
  write(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    callback: (...args) => void,
  );
  write(
    fd: number,
    buffer: Buffer | ArrayBufferView | DataView,
    offset: number,
    length: number,
    position: number,
    callback: (...args) => void,
  );
  write(fd: number, str: string, callback: (...args) => void);
  write(fd: number, str: string, position: number, callback: (...args) => void);
  write(fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args) => void);
  write(fd: number, a?, b?, c?, d?, e?) {
    const [, asStr, buf, offset, length, position, cb] = getWriteArgs(fd, a, b, c, d, e);
    Promise.resolve().then(() => {
      try {
        const bytes = this.writeBase(fd, buf, offset, length, position);
        if (!asStr) {
          cb(null, bytes, buf);
        } else {
          cb(null, bytes, a);
        }
      } catch (err) {
        cb(err);
      }
    });
  }

  private writevBase(fd: number, buffers: ArrayBufferView[], position: number | null): number {
    const file = this.getFileByFdOrThrow(fd);
    let p = position ?? undefined;
    if (p === -1) {
      p = undefined;
    }
    let bytesWritten = 0;
    for (const buffer of buffers) {
      const nodeBuf = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const bytes = file.write(nodeBuf, 0, nodeBuf.byteLength, p);
      p = undefined;
      bytesWritten += bytes;
      if (bytes < nodeBuf.byteLength) break;
    }
    return bytesWritten;
  }

  writev(fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;
  writev(fd: number, buffers: ArrayBufferView[], position: number | null, callback: WritevCallback): void;
  writev(fd: number, buffers: ArrayBufferView[], a: number | null | WritevCallback, b?: WritevCallback): void {
    let position: number | null = a as number | null;
    let callback: WritevCallback = b as WritevCallback;

    if (typeof a === 'function') {
      position = null;
      callback = a;
    }

    validateCallback(callback);

    Promise.resolve().then(() => {
      try {
        const bytes = this.writevBase(fd, buffers, position);
        callback(null, bytes, buffers);
      } catch (err) {
        callback(err);
      }
    });
  }

  writevSync(fd: number, buffers: ArrayBufferView[], position: number | null): number {
    validateFd(fd);
    return this.writevBase(fd, buffers, position);
  }

  private writeFileBase(id: TFileId, buf: Buffer, flagsNum: number, modeNum: number) {
    // console.log('writeFileBase', id, buf, flagsNum, modeNum);
    // const node = this.getNodeByIdOrCreate(id, flagsNum, modeNum);
    // node.setBuffer(buf);

    const isUserFd = typeof id === 'number';
    let fd: number;

    if (isUserFd) fd = id as number;
    else {
      fd = this.openBase(pathToFilename(id as PathLike), flagsNum, modeNum);
      // fd = this.openSync(id as PathLike, flagsNum, modeNum);
    }

    let offset = 0;
    let length = buf.length;
    let position = flagsNum & O_APPEND ? undefined : 0;
    try {
      while (length > 0) {
        const written = this.writeSync(fd, buf, offset, length, position);
        offset += written;
        length -= written;
        if (position !== undefined) position += written;
      }
    } finally {
      if (!isUserFd) this.closeSync(fd);
    }
  }

  writeFileSync(id: TFileId, data: TData, options?: opts.IWriteFileOptions): void {
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    this.writeFileBase(id, buf, flagsNum, modeNum);
  }

  writeFile(id: TFileId, data: TData, callback: TCallback<void>);
  writeFile(id: TFileId, data: TData, options: opts.IWriteFileOptions | string, callback: TCallback<void>);
  writeFile(id: TFileId, data: TData, a: TCallback<void> | opts.IWriteFileOptions | string, b?: TCallback<void>) {
    let options: opts.IWriteFileOptions | string = a as opts.IWriteFileOptions;
    let callback: TCallback<void> | undefined = b;
    if (typeof a === 'function') {
      options = writeFileDefaults;
      callback = a;
    }
    const cb = validateCallback(callback);
    const opts = getWriteFileOptions(options);
    const flagsNum = flagsToNumber(opts.flag);
    const modeNum = modeToNumber(opts.mode);
    const buf = dataToBuffer(data, opts.encoding);
    this.wrapAsync(this.writeFileBase, [id, buf, flagsNum, modeNum], cb);
  }

  private linkBase(filename1: string, filename2: string) {
    let link1: Link;
    try {
      link1 = this.getLinkOrThrow(filename1, 'link');
    } catch (err) {
      // Augment error with filename2
      if (err.code) err = createError(err.code, 'link', filename1, filename2);
      throw err;
    }

    const dirname2 = pathModule.dirname(filename2);
    let dir2: Link;
    try {
      dir2 = this.getLinkOrThrow(dirname2, 'link');
    } catch (err) {
      // Augment error with filename1
      if (err.code) err = createError(err.code, 'link', filename1, filename2);
      throw err;
    }

    const name = pathModule.basename(filename2);

    // Check if new file already exists.
    if (dir2.getChild(name)) throw createError(EEXIST, 'link', filename1, filename2);

    const node = link1.getNode();
    node.nlink++;
    dir2.createChild(name, node);
  }

  private copyFileBase(src: string, dest: string, flags: number) {
    const buf = this.readFileSync(src) as Buffer;

    if (flags & COPYFILE_EXCL) {
      if (this.existsSync(dest)) {
        throw createError(EEXIST, 'copyFile', src, dest);
      }
    }

    if (flags & COPYFILE_FICLONE_FORCE) {
      throw createError(ENOSYS, 'copyFile', src, dest);
    }

    this.writeFileBase(dest, buf, FLAGS.w, MODE.DEFAULT);
  }

  copyFileSync(src: PathLike, dest: PathLike, flags?: TFlagsCopy) {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);

    return this.copyFileBase(srcFilename, destFilename, (flags || 0) | 0);
  }

  copyFile(src: PathLike, dest: PathLike, callback: TCallback<void>);
  copyFile(src: PathLike, dest: PathLike, flags: TFlagsCopy, callback: TCallback<void>);
  copyFile(src: PathLike, dest: PathLike, a, b?) {
    const srcFilename = pathToFilename(src);
    const destFilename = pathToFilename(dest);

    let flags: TFlagsCopy;
    let callback: TCallback<void>;

    if (typeof a === 'function') {
      flags = 0;
      callback = a;
    } else {
      flags = a;
      callback = b;
    }

    validateCallback(callback);

    this.wrapAsync(this.copyFileBase, [srcFilename, destFilename, flags], callback);
  }

  private cpSyncBase(src: string, dest: string, options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean }): void {
    // Apply filter if provided
    if (options.filter && !options.filter(src, dest)) {
      return;
    }

    // Get stats for both src and dest - use stat if dereference, lstat otherwise
    const statFunc = options.dereference ? this.statSync.bind(this) : this.lstatSync.bind(this);
    const srcStat = statFunc(src);
    let destStat: Stats | null = null;
    
    try {
      destStat = this.lstatSync(dest);
    } catch (err) {
      if ((err as any).code !== 'ENOENT') {
        throw err;
      }
    }

    // Check if src and dest are the same (both exist and have same inode)
    if (destStat && this.areIdentical(srcStat, destStat)) {
      throw createError(EINVAL, 'cp', src, dest);
    }

    // Check type compatibility
    if (destStat) {
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        throw createError(EISDIR, 'cp', src, dest);
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        throw createError(ENOTDIR, 'cp', src, dest);
      }
    }

    // Check if trying to copy directory to subdirectory of itself
    if (srcStat.isDirectory() && this.isSrcSubdir(src, dest)) {
      throw createError(EINVAL, 'cp', src, dest);
    }

    // Ensure parent directory exists
    this.ensureParentDir(dest);

    // Handle different file types
    if (srcStat.isDirectory()) {
      if (!options.recursive) {
        throw createError(EISDIR, 'cp', src);
      }
      this.cpDirSync(srcStat, destStat, src, dest, options);
    } else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) {
      this.cpFileSync(srcStat, destStat, src, dest, options);
    } else if (srcStat.isSymbolicLink() && !options.dereference) {
      // Only handle as symlink if not dereferencing
      this.cpSymlinkSync(destStat, src, dest, options);
    } else {
      throw createError(EINVAL, 'cp', src);
    }
  }

  private areIdentical(srcStat: Stats, destStat: Stats): boolean {
    return srcStat.ino === destStat.ino && srcStat.dev === destStat.dev;
  }

  private isSrcSubdir(src: string, dest: string): boolean {
    const normalizedSrc = resolveCrossPlatform(src);
    const normalizedDest = resolveCrossPlatform(dest);
    return normalizedDest.startsWith(normalizedSrc + sep);
  }

  private ensureParentDir(dest: string): void {
    const parent = dirname(dest);
    if (!this.existsSync(parent)) {
      this.mkdirSync(parent, { recursive: true });
    }
  }

  private cpFileSync(srcStat: Stats, destStat: Stats | null, src: string, dest: string, options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean }): void {
    if (destStat) {
      if (options.errorOnExist) {
        throw createError(EEXIST, 'cp', dest);
      }
      if (!options.force) {
        return;
      }
      this.unlinkSync(dest);
    }

    // Copy the file
    this.copyFileSync(src, dest, options.mode);

    // Preserve timestamps if requested
    if (options.preserveTimestamps) {
      this.utimesSync(dest, srcStat.atime, srcStat.mtime);
    }

    // Set file mode
    this.chmodSync(dest, Number(srcStat.mode));
  }

  private cpDirSync(srcStat: Stats, destStat: Stats | null, src: string, dest: string, options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean }): void {
    if (!destStat) {
      this.mkdirSync(dest);
    }

    // Read directory contents
    const entries = this.readdirSync(src);
    
    for (const entry of entries) {
      const srcItem = join(src, entry);
      const destItem = join(dest, entry);
      
      // Apply filter to each item
      if (options.filter && !options.filter(srcItem, destItem)) {
        continue;
      }

      this.cpSyncBase(srcItem, destItem, options);
    }

    // Set directory mode
    this.chmodSync(dest, Number(srcStat.mode));
  }

  private cpSymlinkSync(destStat: Stats | null, src: string, dest: string, options: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean }): void {
    let linkTarget = String(this.readlinkSync(src));
    
    if (!options.verbatimSymlinks && !pathModule.isAbsolute(linkTarget)) {
      linkTarget = resolveCrossPlatform(dirname(src), linkTarget);
    }

    if (destStat) {
      this.unlinkSync(dest);
    }

    this.symlinkSync(linkTarget, dest);
  }

  linkSync(existingPath: PathLike, newPath: PathLike) {
    const existingPathFilename = pathToFilename(existingPath);
    const newPathFilename = pathToFilename(newPath);
    this.linkBase(existingPathFilename, newPathFilename);
  }

  link(existingPath: PathLike, newPath: PathLike, callback: TCallback<void>) {
    const existingPathFilename = pathToFilename(existingPath);
    const newPathFilename = pathToFilename(newPath);
    this.wrapAsync(this.linkBase, [existingPathFilename, newPathFilename], callback);
  }

  private unlinkBase(filename: string) {
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
  }

  unlinkSync(path: PathLike) {
    const filename = pathToFilename(path);
    this.unlinkBase(filename);
  }

  unlink(path: PathLike, callback: TCallback<void>) {
    const filename = pathToFilename(path);
    this.wrapAsync(this.unlinkBase, [filename], callback);
  }

  private symlinkBase(targetFilename: string, pathFilename: string): Link {
    const pathSteps = filenameToSteps(pathFilename);

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
    if (dirLink.getChild(name)) throw createError(EEXIST, 'symlink', targetFilename, pathFilename);

    // Check permissions on the path where we are creating the symlink.
    // Note we're not checking permissions on the target path: It is not an error to create a symlink to a
    // non-existent or inaccessible target
    const node = dirLink.getNode();
    if (!node.canExecute() || !node.canWrite()) throw createError(EACCES, 'symlink', targetFilename, pathFilename);

    // Create symlink.
    const symlink: Link = dirLink.createChild(name);
    symlink.getNode().makeSymlink(targetFilename);

    return symlink;
  }

  // `type` argument works only on Windows.
  symlinkSync(target: PathLike, path: PathLike, type?: symlink.Type) {
    const targetFilename = pathToFilename(target);
    const pathFilename = pathToFilename(path);
    this.symlinkBase(targetFilename, pathFilename);
  }

  symlink(target: PathLike, path: PathLike, callback: TCallback<void>);
  symlink(target: PathLike, path: PathLike, type: symlink.Type, callback: TCallback<void>);
  symlink(target: PathLike, path: PathLike, a: symlink.Type | TCallback<void>, b?: TCallback<void>) {
    const callback: TCallback<void> = validateCallback(typeof a === 'function' ? a : b);
    const targetFilename = pathToFilename(target);
    const pathFilename = pathToFilename(path);
    this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
  }

  private realpathBase(filename: string, encoding: TEncodingExtended | undefined): TDataOut {
    const realLink = this.getResolvedLinkOrThrow(filename, 'realpath');

    return strToEncoding(realLink.getPath() || '/', encoding);
  }

  realpathSync(path: PathLike, options?: opts.IRealpathOptions | string): TDataOut {
    return this.realpathBase(pathToFilename(path), getRealpathOptions(options).encoding);
  }

  realpath(path: PathLike, callback: TCallback<TDataOut>);
  realpath(path: PathLike, options: opts.IRealpathOptions | string, callback: TCallback<TDataOut>);
  realpath(path: PathLike, a: TCallback<TDataOut> | opts.IRealpathOptions | string, b?: TCallback<TDataOut>) {
    const [opts, callback] = getRealpathOptsAndCb(a, b);
    const pathFilename = pathToFilename(path);
    this.wrapAsync(this.realpathBase, [pathFilename, opts.encoding], callback);
  }

  private lstatBase(filename: string, bigint: false, throwIfNoEntry: true): Stats<number>;
  private lstatBase(filename: string, bigint: true, throwIfNoEntry: true): Stats<bigint>;
  private lstatBase(filename: string, bigint: true, throwIfNoEntry: false): Stats<bigint> | undefined;
  private lstatBase(filename: string, bigint: false, throwIfNoEntry: false): Stats<number> | undefined;
  private lstatBase(filename: string, bigint = false, throwIfNoEntry = false): Stats | undefined {
    let link: Link;
    try {
      link = this.getLinkOrThrow(filename, 'lstat');
    } catch (err) {
      if (err.code === ENOENT && !throwIfNoEntry) return undefined;
      else throw err;
    }

    return Stats.build(link.getNode(), bigint);
  }

  lstatSync(path: PathLike): Stats<number>;
  lstatSync(path: PathLike, options: { throwIfNoEntry?: true | undefined }): Stats<number>;
  lstatSync(path: PathLike, options: { bigint: false; throwIfNoEntry?: true | undefined }): Stats<number>;
  lstatSync(path: PathLike, options: { bigint: true; throwIfNoEntry?: true | undefined }): Stats<bigint>;
  lstatSync(path: PathLike, options: { throwIfNoEntry: false }): Stats<number> | undefined;
  lstatSync(path: PathLike, options: { bigint: false; throwIfNoEntry: false }): Stats<number> | undefined;
  lstatSync(path: PathLike, options: { bigint: true; throwIfNoEntry: false }): Stats<bigint> | undefined;
  lstatSync(path: PathLike, options?: opts.IStatOptions): Stats | undefined {
    const { throwIfNoEntry = true, bigint = false } = getStatOptions(options);
    return this.lstatBase(pathToFilename(path), bigint as any, throwIfNoEntry as any);
  }

  lstat(path: PathLike, callback: TCallback<Stats>): void;
  lstat(path: PathLike, options: opts.IStatOptions, callback: TCallback<Stats>): void;
  lstat(path: PathLike, a: TCallback<Stats> | opts.IStatOptions, b?: TCallback<Stats>): void {
    const [{ throwIfNoEntry = true, bigint = false }, callback] = getStatOptsAndCb(a, b);
    this.wrapAsync(this.lstatBase, [pathToFilename(path), bigint, throwIfNoEntry], callback);
  }

  private statBase(filename: string): Stats<number>;
  private statBase(filename: string, bigint: false, throwIfNoEntry: true): Stats<number>;
  private statBase(filename: string, bigint: true, throwIfNoEntry: true): Stats<bigint>;
  private statBase(filename: string, bigint: true, throwIfNoEntry: false): Stats<bigint> | undefined;
  private statBase(filename: string, bigint: false, throwIfNoEntry: false): Stats<number> | undefined;
  private statBase(filename: string, bigint = false, throwIfNoEntry = true): Stats | undefined {
    let link: Link;
    try {
      link = this.getResolvedLinkOrThrow(filename, 'stat');
    } catch (err) {
      if (err.code === ENOENT && !throwIfNoEntry) return undefined;
      else throw err;
    }
    return Stats.build(link.getNode(), bigint);
  }

  statSync(path: PathLike): Stats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry?: true }): Stats<number>;
  statSync(path: PathLike, options: { throwIfNoEntry: false }): Stats<number> | undefined;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry?: true }): Stats<number>;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry?: true }): Stats<bigint>;
  statSync(path: PathLike, options: { bigint: false; throwIfNoEntry: false }): Stats<number> | undefined;
  statSync(path: PathLike, options: { bigint: true; throwIfNoEntry: false }): Stats<bigint> | undefined;
  statSync(path: PathLike, options?: opts.IStatOptions): Stats | undefined {
    const { bigint = true, throwIfNoEntry = true } = getStatOptions(options);

    return this.statBase(pathToFilename(path), bigint as any, throwIfNoEntry as any);
  }

  stat(path: PathLike, callback: TCallback<Stats>): void;
  stat(path: PathLike, options: opts.IStatOptions, callback: TCallback<Stats>): void;
  stat(path: PathLike, a: TCallback<Stats> | opts.IStatOptions, b?: TCallback<Stats>): void {
    const [{ bigint = false, throwIfNoEntry = true }, callback] = getStatOptsAndCb(a, b);

    this.wrapAsync(this.statBase, [pathToFilename(path), bigint, throwIfNoEntry], callback);
  }

  private fstatBase(fd: number): Stats<number>;
  private fstatBase(fd: number, bigint: false): Stats<number>;
  private fstatBase(fd: number, bigint: true): Stats<bigint>;
  private fstatBase(fd: number, bigint: boolean = false): Stats {
    const file = this.getFileByFd(fd);
    if (!file) throw createError(EBADF, 'fstat');
    return Stats.build(file.node, bigint);
  }

  fstatSync(fd: number): Stats<number>;
  fstatSync(fd: number, options: { bigint: false }): Stats<number>;
  fstatSync(fd: number, options: { bigint: true }): Stats<bigint>;
  fstatSync(fd: number, options?: opts.IFStatOptions): Stats {
    return this.fstatBase(fd, getStatOptions(options).bigint as any);
  }

  fstat(fd: number, callback: TCallback<Stats>): void;
  fstat(fd: number, options: opts.IFStatOptions, callback: TCallback<Stats>): void;
  fstat(fd: number, a: TCallback<Stats> | opts.IFStatOptions, b?: TCallback<Stats>): void {
    const [opts, callback] = getStatOptsAndCb(a, b);
    this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
  }

  private renameBase(oldPathFilename: string, newPathFilename: string) {
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

    // Check we have access and write permissions in both places
    const oldParentNode: Node = oldLinkParent.getNode();
    const newPathDirNode: Node = newPathDirLink.getNode();
    if (
      !oldParentNode.canExecute() ||
      !oldParentNode.canWrite() ||
      !newPathDirNode.canExecute() ||
      !newPathDirNode.canWrite()
    ) {
      throw createError(EACCES, 'rename', oldPathFilename, newPathFilename);
    }

    oldLinkParent.deleteChild(link);

    // Rename should overwrite the new path, if that exists.
    const name = pathModule.basename(newPathFilename);
    link.name = name;
    link.steps = [...newPathDirLink.steps, name];
    newPathDirLink.setChild(link.getName(), link);
  }

  renameSync(oldPath: PathLike, newPath: PathLike) {
    const oldPathFilename = pathToFilename(oldPath);
    const newPathFilename = pathToFilename(newPath);
    this.renameBase(oldPathFilename, newPathFilename);
  }

  rename(oldPath: PathLike, newPath: PathLike, callback: TCallback<void>) {
    const oldPathFilename = pathToFilename(oldPath);
    const newPathFilename = pathToFilename(newPath);
    this.wrapAsync(this.renameBase, [oldPathFilename, newPathFilename], callback);
  }

  private existsBase(filename: string): boolean {
    return !!this.statBase(filename);
  }

  existsSync(path: PathLike): boolean {
    try {
      return this.existsBase(pathToFilename(path));
    } catch (err) {
      return false;
    }
  }

  exists(path: PathLike, callback: (exists: boolean) => void) {
    const filename = pathToFilename(path);

    if (typeof callback !== 'function') throw Error(ERRSTR.CB);

    Promise.resolve().then(() => {
      try {
        callback(this.existsBase(filename));
      } catch (err) {
        callback(false);
      }
    });
  }

  private accessBase(filename: string, mode: number) {
    const link = this.getLinkOrThrow(filename, 'access');
  }

  accessSync(path: PathLike, mode: number = F_OK) {
    const filename = pathToFilename(path);
    mode = mode | 0;
    this.accessBase(filename, mode);
  }

  access(path: PathLike, callback: TCallback<void>);
  access(path: PathLike, mode: number, callback: TCallback<void>);
  access(path: PathLike, a: TCallback<void> | number, b?: TCallback<void>) {
    let mode: number = F_OK;
    let callback: TCallback<void>;

    if (typeof a !== 'function') {
      mode = a | 0; // cast to number
      callback = validateCallback(b);
    } else {
      callback = a;
    }

    const filename = pathToFilename(path);

    this.wrapAsync(this.accessBase, [filename, mode], callback);
  }

  appendFileSync(id: TFileId, data: TData, options?: IAppendFileOptions | string) {
    const opts = getAppendFileOpts(options);

    // force append behavior when using a supplied file descriptor
    if (!opts.flag || isFd(id)) opts.flag = 'a';

    this.writeFileSync(id, data, opts);
  }

  appendFile(id: TFileId, data: TData, callback: TCallback<void>);
  appendFile(id: TFileId, data: TData, options: IAppendFileOptions | string, callback: TCallback<void>);
  appendFile(id: TFileId, data: TData, a, b?) {
    const [opts, callback] = getAppendFileOptsAndCb(a, b);

    // force append behavior when using a supplied file descriptor
    if (!opts.flag || isFd(id)) opts.flag = 'a';

    this.writeFile(id, data, opts, callback);
  }

  private readdirBase(filename: string, options: opts.IReaddirOptions): TDataOut[] | Dirent[] {
    const steps = filenameToSteps(filename);
    const link: Link = this.getResolvedLinkOrThrow(filename, 'scandir');

    const node = link.getNode();
    if (!node.isDirectory()) throw createError(ENOTDIR, 'scandir', filename);

    // Check we have permissions
    if (!node.canRead()) throw createError(EACCES, 'scandir', filename);

    const list: Dirent[] = []; // output list

    for (const name of link.children.keys()) {
      const child = link.getChild(name);

      if (!child || name === '.' || name === '..') continue;

      list.push(Dirent.build(child, options.encoding));

      // recursion
      if (options.recursive && child.children.size) {
        const recurseOptions = { ...options, recursive: true, withFileTypes: true };
        const childList = this.readdirBase(child.getPath(), recurseOptions) as Dirent[];
        list.push(...childList);
      }
    }

    if (!isWin && options.encoding !== 'buffer')
      list.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

    if (options.withFileTypes) return list;

    let filename2 = filename;

    if (isWin) {
      filename2 = filename2.replace(/\\/g, '/');
    }

    return list.map(dirent => {
      if (options.recursive) {
        let fullPath = pathModule.join(dirent.parentPath, dirent.name.toString());
        if (isWin) {
          fullPath = fullPath.replace(/\\/g, '/');
        }
        return fullPath.replace(filename2 + pathModule.posix.sep, '');
      }
      return dirent.name;
    });
  }

  readdirSync(path: PathLike, options?: opts.IReaddirOptions | string): TDataOut[] | Dirent[] {
    const opts = getReaddirOptions(options);
    const filename = pathToFilename(path);
    return this.readdirBase(filename, opts);
  }

  readdir(path: PathLike, callback: TCallback<TDataOut[] | Dirent[]>);
  readdir(path: PathLike, options: opts.IReaddirOptions | string, callback: TCallback<TDataOut[] | Dirent[]>);
  readdir(path: PathLike, a?, b?) {
    const [options, callback] = getReaddirOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this.readdirBase, [filename, options], callback);
  }

  private readlinkBase(filename: string, encoding: TEncodingExtended | undefined): TDataOut {
    const link = this.getLinkOrThrow(filename, 'readlink');
    const node = link.getNode();

    if (!node.isSymlink()) throw createError(EINVAL, 'readlink', filename);

    return strToEncoding(node.symlink, encoding);
  }

  readlinkSync(path: PathLike, options?: opts.IOptions): TDataOut {
    const opts = getDefaultOpts(options);
    const filename = pathToFilename(path);
    return this.readlinkBase(filename, opts.encoding);
  }

  readlink(path: PathLike, callback: TCallback<TDataOut>);
  readlink(path: PathLike, options: opts.IOptions, callback: TCallback<TDataOut>);
  readlink(path: PathLike, a: TCallback<TDataOut> | opts.IOptions, b?: TCallback<TDataOut>) {
    const [opts, callback] = getDefaultOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this.readlinkBase, [filename, opts.encoding], callback);
  }

  private fsyncBase(fd: number) {
    this.getFileByFdOrThrow(fd, 'fsync');
  }

  fsyncSync(fd: number) {
    this.fsyncBase(fd);
  }

  fsync(fd: number, callback: TCallback<void>) {
    this.wrapAsync(this.fsyncBase, [fd], callback);
  }

  private fdatasyncBase(fd: number) {
    this.getFileByFdOrThrow(fd, 'fdatasync');
  }

  fdatasyncSync(fd: number) {
    this.fdatasyncBase(fd);
  }

  fdatasync(fd: number, callback: TCallback<void>) {
    this.wrapAsync(this.fdatasyncBase, [fd], callback);
  }

  private ftruncateBase(fd: number, len?: number) {
    const file = this.getFileByFdOrThrow(fd, 'ftruncate');
    file.truncate(len);
  }

  ftruncateSync(fd: number, len?: number) {
    this.ftruncateBase(fd, len);
  }

  ftruncate(fd: number, callback: TCallback<void>);
  ftruncate(fd: number, len: number, callback: TCallback<void>);
  ftruncate(fd: number, a: TCallback<void> | number, b?: TCallback<void>) {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: TCallback<void> = validateCallback(typeof a === 'number' ? b : a);

    this.wrapAsync(this.ftruncateBase, [fd, len], callback);
  }

  private truncateBase(path: PathLike, len?: number) {
    const fd = this.openSync(path, 'r+');
    try {
      this.ftruncateSync(fd, len);
    } finally {
      this.closeSync(fd);
    }
  }

  /**
   * `id` should be a file descriptor or a path. `id` as file descriptor will
   * not be supported soon.
   */
  truncateSync(id: TFileId, len?: number) {
    if (isFd(id)) return this.ftruncateSync(id as number, len);

    this.truncateBase(id as PathLike, len);
  }

  truncate(id: TFileId, callback: TCallback<void>);
  truncate(id: TFileId, len: number, callback: TCallback<void>);
  truncate(id: TFileId, a: TCallback<void> | number, b?: TCallback<void>) {
    const len: number = typeof a === 'number' ? a : 0;
    const callback: TCallback<void> = validateCallback(typeof a === 'number' ? b : a);

    if (isFd(id)) return this.ftruncate(id as number, len, callback);

    this.wrapAsync(this.truncateBase, [id, len], callback);
  }

  private futimesBase(fd: number, atime: number, mtime: number) {
    const file = this.getFileByFdOrThrow(fd, 'futimes');
    const node = file.node;
    node.atime = new Date(atime * 1000);
    node.mtime = new Date(mtime * 1000);
  }

  futimesSync(fd: number, atime: TTime, mtime: TTime) {
    this.futimesBase(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
  }

  futimes(fd: number, atime: TTime, mtime: TTime, callback: TCallback<void>) {
    this.wrapAsync(this.futimesBase, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
  }

  private utimesBase(filename: string, atime: number, mtime: number, followSymlinks: boolean = true) {
    const link = followSymlinks
      ? this.getResolvedLinkOrThrow(filename, 'utimes')
      : this.getLinkOrThrow(filename, 'lutimes');
    const node = link.getNode();
    node.atime = new Date(atime * 1000);
    node.mtime = new Date(mtime * 1000);
  }

  utimesSync(path: PathLike, atime: TTime, mtime: TTime) {
    this.utimesBase(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true);
  }

  utimes(path: PathLike, atime: TTime, mtime: TTime, callback: TCallback<void>) {
    this.wrapAsync(
      this.utimesBase,
      [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), true],
      callback,
    );
  }

  lutimesSync(path: PathLike, atime: TTime, mtime: TTime): void {
    this.utimesBase(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false);
  }

  lutimes(path: PathLike, atime: TTime, mtime: TTime, callback: TCallback<void>): void {
    this.wrapAsync(
      this.utimesBase,
      [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime), false],
      callback,
    );
  }

  private mkdirBase(filename: string, modeNum: number) {
    const steps = filenameToSteps(filename);

    // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
    if (!steps.length) {
      throw createError(EEXIST, 'mkdir', filename);
    }

    const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');

    // Check path already exists.
    const name = steps[steps.length - 1];
    if (dir.getChild(name)) throw createError(EEXIST, 'mkdir', filename);

    const node = dir.getNode();
    if (!node.canWrite() || !node.canExecute()) throw createError(EACCES, 'mkdir', filename);

    dir.createChild(name, this.createNode(constants.S_IFDIR | modeNum));
  }

  /**
   * Creates directory tree recursively.
   */
  private mkdirpBase(filename: string, modeNum: number) {
    let created = false;
    const steps = filenameToSteps(filename);

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
        if (!node.canExecute() || !node.canWrite()) throw createError(EACCES, 'mkdir', filename);
      } else {
        throw createError(ENOTDIR, 'mkdir', filename);
      }

      created = true;
      curr = curr.createChild(steps[i], this.createNode(constants.S_IFDIR | modeNum));
    }
    return created ? filename : undefined;
  }

  mkdirSync(path: PathLike, options: opts.IMkdirOptions & { recursive: true }): string | undefined;
  mkdirSync(path: PathLike, options?: TMode | (opts.IMkdirOptions & { recursive?: false })): void;
  mkdirSync(path: PathLike, options?: TMode | opts.IMkdirOptions): string | undefined;
  mkdirSync(path: PathLike, options?: TMode | opts.IMkdirOptions) {
    const opts = getMkdirOptions(options);
    const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
    if (opts.recursive) return this.mkdirpBase(filename, modeNum);
    this.mkdirBase(filename, modeNum);
  }

  mkdir(path: PathLike, callback: TCallback<void>);
  mkdir(path: PathLike, mode: TMode | (opts.IMkdirOptions & { recursive?: false }), callback: TCallback<void>);
  mkdir(path: PathLike, mode: opts.IMkdirOptions & { recursive: true }, callback: TCallback<string>);
  mkdir(path: PathLike, mode: TMode | opts.IMkdirOptions, callback: TCallback<string>);
  mkdir(path: PathLike, a: TCallback<void> | TMode | opts.IMkdirOptions, b?: TCallback<string> | TCallback<void>) {
    const opts: TMode | opts.IMkdirOptions = getMkdirOptions(a);
    const callback = validateCallback(typeof a === 'function' ? a : b!);
    const modeNum = modeToNumber(opts.mode, 0o777);
    const filename = pathToFilename(path);
    if (opts.recursive) this.wrapAsync(this.mkdirpBase, [filename, modeNum], callback);
    else this.wrapAsync(this.mkdirBase, [filename, modeNum], callback);
  }

  private mkdtempBase(prefix: string, encoding?: TEncodingExtended, retry: number = 5): TDataOut {
    const filename = prefix + genRndStr6();
    try {
      this.mkdirBase(filename, MODE.DIR);
      return strToEncoding(filename, encoding);
    } catch (err) {
      if (err.code === EEXIST) {
        if (retry > 1) return this.mkdtempBase(prefix, encoding, retry - 1);
        else throw Error('Could not create temp dir.');
      } else throw err;
    }
  }

  mkdtempSync(prefix: string, options?: opts.IOptions): TDataOut {
    const { encoding } = getDefaultOpts(options);

    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');

    nullCheck(prefix);

    return this.mkdtempBase(prefix, encoding);
  }

  mkdtemp(prefix: string, callback: TCallback<string>);
  mkdtemp(prefix: string, options: opts.IOptions, callback: TCallback<string>);
  mkdtemp(prefix: string, a: TCallback<string> | opts.IOptions, b?: TCallback<string>) {
    const [{ encoding }, callback] = getDefaultOptsAndCb(a, b);

    if (!prefix || typeof prefix !== 'string') throw new TypeError('filename prefix is required');

    if (!nullCheck(prefix)) return;

    this.wrapAsync(this.mkdtempBase, [prefix, encoding], callback);
  }

  private rmdirBase(filename: string, options?: opts.IRmdirOptions) {
    const opts = getRmdirOptions(options);
    const link = this.getLinkAsDirOrThrow(filename, 'rmdir');

    // Check directory is empty.
    if (link.length && !opts.recursive) throw createError(ENOTEMPTY, 'rmdir', filename);

    this.deleteLink(link);
  }

  rmdirSync(path: PathLike, options?: opts.IRmdirOptions) {
    this.rmdirBase(pathToFilename(path), options);
  }

  rmdir(path: PathLike, callback: TCallback<void>);
  rmdir(path: PathLike, options: opts.IRmdirOptions, callback: TCallback<void>);
  rmdir(path: PathLike, a: TCallback<void> | opts.IRmdirOptions, b?: TCallback<void>) {
    const opts: opts.IRmdirOptions = getRmdirOptions(a);
    const callback: TCallback<void> = validateCallback(typeof a === 'function' ? a : b);
    this.wrapAsync(this.rmdirBase, [pathToFilename(path), opts], callback);
  }

  private rmBase(filename: string, options: opts.IRmOptions = {}): void {
    // "stat" is used to match Node's native error message.
    let link: Link;
    try {
      link = this.getResolvedLinkOrThrow(filename, 'stat');
    } catch (err) {
      // Silently ignore missing paths if force option is true
      if (err.code === ENOENT && options.force) return;
      else throw err;
    }

    if (link.getNode().isDirectory() && !options.recursive) throw createError(ERR_FS_EISDIR, 'rm', filename);

    // Check permissions
    if (!link.parent.getNode().canWrite()) throw createError(EACCES, 'rm', filename);

    this.deleteLink(link);
  }

  public rmSync(path: PathLike, options?: opts.IRmOptions): void {
    this.rmBase(pathToFilename(path), options);
  }

  public rm(path: PathLike, callback: TCallback<void>): void;
  public rm(path: PathLike, options: opts.IRmOptions, callback: TCallback<void>): void;
  public rm(path: PathLike, a: TCallback<void> | opts.IRmOptions, b?: TCallback<void>): void {
    const [opts, callback] = getRmOptsAndCb(a, b);
    this.wrapAsync(this.rmBase, [pathToFilename(path), opts], callback);
  }

  private fchmodBase(fd: number, modeNum: number) {
    const file = this.getFileByFdOrThrow(fd, 'fchmod');
    file.chmod(modeNum);
  }

  fchmodSync(fd: number, mode: TMode) {
    this.fchmodBase(fd, modeToNumber(mode));
  }

  fchmod(fd: number, mode: TMode, callback: TCallback<void>) {
    this.wrapAsync(this.fchmodBase, [fd, modeToNumber(mode)], callback);
  }

  private chmodBase(filename: string, modeNum: number, followSymlinks: boolean = true) {
    const link = followSymlinks
      ? this.getResolvedLinkOrThrow(filename, 'chmod')
      : this.getLinkOrThrow(filename, 'chmod');
    const node = link.getNode();
    node.chmod(modeNum);
  }

  chmodSync(path: PathLike, mode: TMode) {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.chmodBase(filename, modeNum, true);
  }

  chmod(path: PathLike, mode: TMode, callback: TCallback<void>) {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.wrapAsync(this.chmodBase, [filename, modeNum], callback);
  }

  private lchmodBase(filename: string, modeNum: number) {
    this.chmodBase(filename, modeNum, false);
  }

  lchmodSync(path: PathLike, mode: TMode) {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.lchmodBase(filename, modeNum);
  }

  lchmod(path: PathLike, mode: TMode, callback: TCallback<void>) {
    const modeNum = modeToNumber(mode);
    const filename = pathToFilename(path);
    this.wrapAsync(this.lchmodBase, [filename, modeNum], callback);
  }

  private fchownBase(fd: number, uid: number, gid: number) {
    this.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
  }

  fchownSync(fd: number, uid: number, gid: number) {
    validateUid(uid);
    validateGid(gid);
    this.fchownBase(fd, uid, gid);
  }

  fchown(fd: number, uid: number, gid: number, callback: TCallback<void>) {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this.fchownBase, [fd, uid, gid], callback);
  }

  private chownBase(filename: string, uid: number, gid: number) {
    const link = this.getResolvedLinkOrThrow(filename, 'chown');
    const node = link.getNode();
    node.chown(uid, gid);

    // if(node.isFile() || node.isSymlink()) {
    //
    // } else if(node.isDirectory()) {
    //
    // } else {
    // TODO: What do we do here?
    // }
  }

  chownSync(path: PathLike, uid: number, gid: number) {
    validateUid(uid);
    validateGid(gid);
    this.chownBase(pathToFilename(path), uid, gid);
  }

  chown(path: PathLike, uid: number, gid: number, callback: TCallback<void>) {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this.chownBase, [pathToFilename(path), uid, gid], callback);
  }

  private lchownBase(filename: string, uid: number, gid: number) {
    this.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
  }

  lchownSync(path: PathLike, uid: number, gid: number) {
    validateUid(uid);
    validateGid(gid);
    this.lchownBase(pathToFilename(path), uid, gid);
  }

  lchown(path: PathLike, uid: number, gid: number, callback: TCallback<void>) {
    validateUid(uid);
    validateGid(gid);
    this.wrapAsync(this.lchownBase, [pathToFilename(path), uid, gid], callback);
  }

  private statWatchers: Record<string, StatWatcher> = {};

  watchFile(path: PathLike, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
  watchFile(path: PathLike, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
  watchFile(path: PathLike, a, b?): StatWatcher {
    const filename = pathToFilename(path);

    let options: IWatchFileOptions | null = a;
    let listener: (curr: Stats, prev: Stats) => void = b;

    if (typeof options === 'function') {
      listener = a;
      options = null;
    }

    if (typeof listener !== 'function') {
      throw Error('"watchFile()" requires a listener function');
    }

    let interval = 5007;
    let persistent = true;

    if (options && typeof options === 'object') {
      if (typeof options.interval === 'number') interval = options.interval;
      if (typeof options.persistent === 'boolean') persistent = options.persistent;
    }

    let watcher: StatWatcher = this.statWatchers[filename];

    if (!watcher) {
      watcher = new this.StatWatcher();
      watcher.start(filename, persistent, interval);
      this.statWatchers[filename] = watcher;
    }

    watcher.addListener('change', listener);
    return watcher;
  }

  unwatchFile(path: PathLike, listener?: (curr: Stats, prev: Stats) => void) {
    const filename = pathToFilename(path);
    const watcher = this.statWatchers[filename];
    if (!watcher) return;

    if (typeof listener === 'function') {
      watcher.removeListener('change', listener);
    } else {
      watcher.removeAllListeners('change');
    }

    if (watcher.listenerCount('change') === 0) {
      watcher.stop();
      delete this.statWatchers[filename];
    }
  }

  createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream {
    return new this.ReadStream(path, options);
  }

  createWriteStream(path: PathLike, options?: opts.IWriteStreamOptions | string): IWriteStream {
    return new this.WriteStream(path, options);
  }

  // watch(path: PathLike): FSWatcher;
  // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
  watch(
    path: PathLike,
    options?: IWatchOptions | string,
    listener?: (eventType: string, filename: string) => void,
  ): FSWatcher {
    const filename = pathToFilename(path);
    let givenOptions: typeof options | null = options;

    if (typeof options === 'function') {
      listener = options;
      givenOptions = null;
    }

    // tslint:disable-next-line prefer-const
    let { persistent, recursive, encoding }: IWatchOptions = getDefaultOpts(givenOptions);
    if (persistent === undefined) persistent = true;
    if (recursive === undefined) recursive = false;

    const watcher = new this.FSWatcher();
    watcher.start(filename, persistent, recursive, encoding as BufferEncoding);

    if (listener) {
      watcher.addListener('change', listener);
    }

    return watcher;
  }

  cpSync(src: string | URL, dest: string | URL, options?: opts.ICpOptions): void {
    const srcFilename = pathToFilename(src as misc.PathLike);
    const destFilename = pathToFilename(dest as misc.PathLike);
    
    const opts_: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean } = {
      dereference: options?.dereference ?? false,
      errorOnExist: options?.errorOnExist ?? false,
      filter: options?.filter,
      force: options?.force ?? true,
      mode: options?.mode ?? 0,
      preserveTimestamps: options?.preserveTimestamps ?? false,
      recursive: options?.recursive ?? false,
      verbatimSymlinks: options?.verbatimSymlinks ?? false,
    };
    
    return this.cpSyncBase(srcFilename, destFilename, opts_);
  }

  cp(src: string | URL, dest: string | URL, callback: TCallback<void>);
  cp(src: string | URL, dest: string | URL, options: opts.ICpOptions, callback: TCallback<void>);
  cp(src: string | URL, dest: string | URL, a?: opts.ICpOptions | TCallback<void>, b?: TCallback<void>) {
    const srcFilename = pathToFilename(src as misc.PathLike);
    const destFilename = pathToFilename(dest as misc.PathLike);

    let options: Partial<opts.ICpOptions>;
    let callback: TCallback<void>;

    if (typeof a === 'function') {
      options = {};
      callback = a;
    } else {
      options = a || {};
      callback = b!;
    }

    validateCallback(callback);

    const opts_: opts.ICpOptions & { filter?: (src: string, dest: string) => boolean } = {
      dereference: options?.dereference ?? false,
      errorOnExist: options?.errorOnExist ?? false,
      filter: options?.filter,
      force: options?.force ?? true,
      mode: options?.mode ?? 0,
      preserveTimestamps: options?.preserveTimestamps ?? false,
      recursive: options?.recursive ?? false,
      verbatimSymlinks: options?.verbatimSymlinks ?? false,
    };

    this.wrapAsync(this.cpSyncBase, [srcFilename, destFilename, opts_], callback);
  }
  public statfsSync: FsSynchronousApi['statfsSync'] = notImplemented;

  public statfs: FsCallbackApi['statfs'] = notImplemented;
  public openAsBlob: FsCallbackApi['openAsBlob'] = notImplemented;

  private opendirBase(filename: string, options: opts.IOpendirOptions): Dir {
    const link: Link = this.getResolvedLinkOrThrow(filename, 'scandir');

    const node = link.getNode();
    if (!node.isDirectory()) throw createError(ENOTDIR, 'scandir', filename);

    return new Dir(link, options);
  }

  opendirSync(path: PathLike, options?: opts.IOpendirOptions | string): Dir {
    const opts = getOpendirOptions(options);
    const filename = pathToFilename(path);
    return this.opendirBase(filename, opts);
  }

  opendir(path: PathLike, callback: TCallback<Dir>);
  opendir(path: PathLike, options: opts.IOpendirOptions | string, callback: TCallback<Dir>);
  opendir(path: PathLike, a?, b?) {
    const [options, callback] = getOpendirOptsAndCb(a, b);
    const filename = pathToFilename(path);
    this.wrapAsync(this.opendirBase, [filename, options], callback);
  }
}

function emitStop(self) {
  self.emit('stop');
}

export class StatWatcher extends EventEmitter {
  vol: Volume;
  filename: string;
  interval: number;
  timeoutRef?;
  setTimeout: TSetTimeout;
  prev: Stats;

  constructor(vol: Volume) {
    super();
    this.vol = vol;
  }

  private loop() {
    this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
  }

  private hasChanged(stats: Stats): boolean {
    // if(!this.prev) return false;
    if (stats.mtimeMs > this.prev.mtimeMs) return true;
    if (stats.nlink !== this.prev.nlink) return true;
    return false;
  }

  private onInterval = () => {
    try {
      const stats = this.vol.statSync(this.filename);
      if (this.hasChanged(stats)) {
        this.emit('change', stats, this.prev);
        this.prev = stats;
      }
    } finally {
      this.loop();
    }
  };

  start(path: string, persistent: boolean = true, interval: number = 5007) {
    this.filename = pathToFilename(path);
    this.setTimeout = persistent
      ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global)
      : setTimeoutUnref;
    this.interval = interval;
    this.prev = this.vol.statSync(this.filename);
    this.loop();
  }

  stop() {
    clearTimeout(this.timeoutRef);
    queueMicrotask(() => {
      emitStop.call(this, this);
    });
  }
}

/* tslint:disable no-var-keyword prefer-const */
// ---------------------------------------- ReadStream

var pool;

function allocNewPool(poolSize) {
  pool = bufferAllocUnsafe(poolSize);
  pool.used = 0;
}

util.inherits(FsReadStream, Readable);
exports.ReadStream = FsReadStream;
function FsReadStream(vol, path, options) {
  if (!(this instanceof FsReadStream)) return new (FsReadStream as any)(vol, path, options);

  this._vol = vol;

  // a little bit bigger buffer and water marks by default
  options = Object.assign({}, getOptions(options, {}));
  if (options.highWaterMark === undefined) options.highWaterMark = 64 * 1024;

  Readable.call(this, options);

  this.path = pathToFilename(path);
  this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = undefined;
  this.bytesRead = 0;

  if (this.start !== undefined) {
    if (typeof this.start !== 'number') {
      throw new TypeError('"start" option must be a Number');
    }
    if (this.end === undefined) {
      this.end = Infinity;
    } else if (typeof this.end !== 'number') {
      throw new TypeError('"end" option must be a Number');
    }

    if (this.start > this.end) {
      throw new Error('"start" option must be <= "end" option');
    }

    this.pos = this.start;
  }

  if (typeof this.fd !== 'number') this.open();

  this.on('end', function () {
    if (this.autoClose) {
      if (this.destroy) this.destroy();
    }
  });
}

FsReadStream.prototype.open = function () {
  var self = this; // tslint:disable-line no-this-assignment
  this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
    if (er) {
      if (self.autoClose) {
        if (self.destroy) self.destroy();
      }
      self.emit('error', er);
      return;
    }

    self.fd = fd;
    self.emit('open', fd);
    // start the flow of data.
    self.read();
  });
};

FsReadStream.prototype._read = function (n) {
  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._read(n);
    });
  }

  if (this.destroyed) return;

  if (!pool || pool.length - pool.used < kMinPoolSpace) {
    // discard the old pool.
    allocNewPool(this._readableState.highWaterMark);
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  var thisPool = pool;
  var toRead = Math.min(pool.length - pool.used, n);
  var start = pool.used;

  if (this.pos !== undefined) toRead = Math.min(this.end - this.pos + 1, toRead);

  // already read everything we were supposed to read!
  // treat as EOF.
  if (toRead <= 0) return this.push(null);

  // the actual read.
  var self = this; // tslint:disable-line no-this-assignment
  this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);

  // move the pool positions, and internal position for reading.
  if (this.pos !== undefined) this.pos += toRead;
  pool.used += toRead;

  function onread(er, bytesRead) {
    if (er) {
      if (self.autoClose && self.destroy) {
        self.destroy();
      }
      self.emit('error', er);
    } else {
      var b = null;
      if (bytesRead > 0) {
        self.bytesRead += bytesRead;
        b = thisPool.slice(start, start + bytesRead);
      }

      self.push(b);
    }
  }
};

FsReadStream.prototype._destroy = function (err, cb) {
  this.close(err2 => {
    cb(err || err2);
  });
};

FsReadStream.prototype.close = function (cb) {
  if (cb) this.once('close', cb);

  if (this.closed || typeof this.fd !== 'number') {
    if (typeof this.fd !== 'number') {
      this.once('open', closeOnOpen);
      return;
    }
    return queueMicrotask(() => this.emit('close'));
  }

  // Since Node 18, there is only a getter for '.closed'.
  // The first branch mimics other setters from Readable.
  // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
  if (typeof this._readableState?.closed === 'boolean') {
    this._readableState.closed = true;
  } else {
    this.closed = true;
  }

  this._vol.close(this.fd, er => {
    if (er) this.emit('error', er);
    else this.emit('close');
  });

  this.fd = null;
};

// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen(fd) {
  this.close();
}

// ---------------------------------------- WriteStream

export interface IWriteStream extends Writable {
  bytesWritten: number;
  path: string;
  pending: boolean;
  new (path: PathLike, options: opts.IWriteStreamOptions);
  open();
  close();
}

util.inherits(FsWriteStream, Writable);
exports.WriteStream = FsWriteStream;
function FsWriteStream(vol, path, options) {
  if (!(this instanceof FsWriteStream)) return new (FsWriteStream as any)(vol, path, options);

  this._vol = vol;
  options = Object.assign({}, getOptions(options, {}));

  Writable.call(this, options);

  this.path = pathToFilename(path);
  this.fd = options.fd === undefined ? null : typeof options.fd !== 'number' ? options.fd.fd : options.fd;
  this.flags = options.flags === undefined ? 'w' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
  this.pos = undefined;
  this.bytesWritten = 0;
  this.pending = true;

  if (this.start !== undefined) {
    if (typeof this.start !== 'number') {
      throw new TypeError('"start" option must be a Number');
    }
    if (this.start < 0) {
      throw new Error('"start" must be >= zero');
    }

    this.pos = this.start;
  }

  if (options.encoding) this.setDefaultEncoding(options.encoding);

  if (typeof this.fd !== 'number') this.open();

  // dispose on finish.
  this.once('finish', function () {
    if (this.autoClose) {
      this.close();
    }
  });
}

FsWriteStream.prototype.open = function () {
  this._vol.open(
    this.path,
    this.flags,
    this.mode,
    function (er, fd) {
      if (er) {
        if (this.autoClose && this.destroy) {
          this.destroy();
        }
        this.emit('error', er);
        return;
      }

      this.fd = fd;
      this.pending = false;
      this.emit('open', fd);
    }.bind(this),
  );
};

FsWriteStream.prototype._write = function (data, encoding, cb) {
  if (!(data instanceof Buffer || data instanceof Uint8Array)) return this.emit('error', new Error('Invalid data'));

  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._write(data, encoding, cb);
    });
  }

  var self = this; // tslint:disable-line no-this-assignment
  this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
    if (er) {
      if (self.autoClose && self.destroy) {
        self.destroy();
      }
      return cb(er);
    }
    self.bytesWritten += bytes;
    cb();
  });

  if (this.pos !== undefined) this.pos += data.length;
};

FsWriteStream.prototype._writev = function (data, cb) {
  if (typeof this.fd !== 'number') {
    return this.once('open', function () {
      this._writev(data, cb);
    });
  }

  const self = this; // tslint:disable-line no-this-assignment
  const len = data.length;
  const chunks = new Array(len);
  var size = 0;

  for (var i = 0; i < len; i++) {
    var chunk = data[i].chunk;

    chunks[i] = chunk;
    size += chunk.length;
  }

  const buf = Buffer.concat(chunks);
  this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
    if (er) {
      if (self.destroy) self.destroy();
      return cb(er);
    }
    self.bytesWritten += bytes;
    cb();
  });

  if (this.pos !== undefined) this.pos += size;
};

FsWriteStream.prototype.close = function (cb) {
  if (cb) this.once('close', cb);

  if (this.closed || typeof this.fd !== 'number') {
    if (typeof this.fd !== 'number') {
      this.once('open', closeOnOpen);
      return;
    }
    return queueMicrotask(() => this.emit('close'));
  }

  // Since Node 18, there is only a getter for '.closed'.
  // The first branch mimics other setters from Writable.
  // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
  if (typeof this._writableState?.closed === 'boolean') {
    this._writableState.closed = true;
  } else {
    this.closed = true;
  }

  this._vol.close(this.fd, er => {
    if (er) this.emit('error', er);
    else this.emit('close');
  });

  this.fd = null;
};

FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;

// There is no shutdown() for files.
FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;

// ---------------------------------------- FSWatcher

export class FSWatcher extends EventEmitter {
  _vol: Volume;
  _filename: string = '';
  _steps: string[];
  _filenameEncoded: TDataOut = '';
  // _persistent: boolean = true;
  _recursive: boolean = false;
  _encoding: BufferEncoding = ENCODING_UTF8;
  _link: Link;

  _timer; // Timer that keeps this task persistent.

  // inode -> removers
  private _listenerRemovers = new Map<number, Array<() => void>>();

  constructor(vol: Volume) {
    super();
    this._vol = vol;

    // TODO: Emit "error" messages when watching.
    // this._handle.onchange = function(status, eventType, filename) {
    //     if (status < 0) {
    //         self._handle.close();
    //         const error = !filename ?
    //             errnoException(status, 'Error watching file for changes:') :
    //             errnoException(status, `Error watching file ${filename} for changes:`);
    //         error.filename = filename;
    //         self.emit('error', error);
    //     } else {
    //         self.emit('change', eventType, filename);
    //     }
    // };
  }

  private _getName(): string {
    return this._steps[this._steps.length - 1];
  }

  private _onParentChild = (link: Link) => {
    if (link.getName() === this._getName()) {
      this._emit('rename');
    }
  };

  private _emit = (type: 'change' | 'rename') => {
    this.emit('change', type, this._filenameEncoded);
  };

  private _persist = () => {
    this._timer = setTimeout(this._persist, 1e6);
  };

  start(
    path: PathLike,
    persistent: boolean = true,
    recursive: boolean = false,
    encoding: BufferEncoding = ENCODING_UTF8,
  ) {
    this._filename = pathToFilename(path);
    this._steps = filenameToSteps(this._filename);
    this._filenameEncoded = strToEncoding(this._filename);
    // this._persistent = persistent;
    this._recursive = recursive;
    this._encoding = encoding;

    try {
      this._link = this._vol.getLinkOrThrow(this._filename, 'FSWatcher');
    } catch (err) {
      const error = new Error(`watch ${this._filename} ${err.code}`);
      (error as any).code = err.code;
      (error as any).errno = err.code;
      throw error;
    }

    const watchLinkNodeChanged = (link: Link) => {
      const filepath = link.getPath();
      const node = link.getNode();
      const onNodeChange = () => {
        let filename = relative(this._filename, filepath);

        if (!filename) {
          filename = this._getName();
        }

        return this.emit('change', 'change', filename);
      };
      node.on('change', onNodeChange);

      const removers = this._listenerRemovers.get(node.ino) ?? [];
      removers.push(() => node.removeListener('change', onNodeChange));
      this._listenerRemovers.set(node.ino, removers);
    };

    const watchLinkChildrenChanged = (link: Link) => {
      const node = link.getNode();

      // when a new link added
      const onLinkChildAdd = (l: Link) => {
        this.emit('change', 'rename', relative(this._filename, l.getPath()));

        setTimeout(() => {
          // 1. watch changes of the new link-node
          watchLinkNodeChanged(l);
          // 2. watch changes of the new link-node's children
          watchLinkChildrenChanged(l);
        });
      };

      // when a new link deleted
      const onLinkChildDelete = (l: Link) => {
        // remove the listeners of the children nodes
        const removeLinkNodeListeners = (curLink: Link) => {
          const ino = curLink.getNode().ino;
          const removers = this._listenerRemovers.get(ino);
          if (removers) {
            removers.forEach(r => r());
            this._listenerRemovers.delete(ino);
          }
          for (const [name, childLink] of curLink.children.entries()) {
            if (childLink && name !== '.' && name !== '..') {
              removeLinkNodeListeners(childLink);
            }
          }
        };
        removeLinkNodeListeners(l);

        this.emit('change', 'rename', relative(this._filename, l.getPath()));
      };

      // children nodes changed
      for (const [name, childLink] of link.children.entries()) {
        if (childLink && name !== '.' && name !== '..') {
          watchLinkNodeChanged(childLink);
        }
      }
      // link children add/remove
      link.on('child:add', onLinkChildAdd);
      link.on('child:delete', onLinkChildDelete);

      const removers = this._listenerRemovers.get(node.ino) ?? [];
      removers.push(() => {
        link.removeListener('child:add', onLinkChildAdd);
        link.removeListener('child:delete', onLinkChildDelete);
      });

      if (recursive) {
        for (const [name, childLink] of link.children.entries()) {
          if (childLink && name !== '.' && name !== '..') {
            watchLinkChildrenChanged(childLink);
          }
        }
      }
    };
    watchLinkNodeChanged(this._link);
    watchLinkChildrenChanged(this._link);

    const parent = this._link.parent;
    if (parent) {
      // parent.on('child:add', this._onParentChild);
      parent.setMaxListeners(parent.getMaxListeners() + 1);
      parent.on('child:delete', this._onParentChild);
    }

    if (persistent) this._persist();
  }

  close() {
    clearTimeout(this._timer);

    this._listenerRemovers.forEach(removers => {
      removers.forEach(r => r());
    });
    this._listenerRemovers.clear();

    const parent = this._link.parent;
    if (parent) {
      // parent.removeListener('child:add', this._onParentChild);
      parent.removeListener('child:delete', this._onParentChild);
    }
  }
}
