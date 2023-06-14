import {NodeFileSystemHandle} from "./NodeFileSystemHandle";
import {assertName, basename, ctx as createCtx, newNotAllowedError, newNotFoundError, newTypeMismatchError} from "./util";
import {NodeFileSystemFileHandle} from "./NodeFileSystemFileHandle";
import type {NodeFsaContext, NodeFsaFs} from "./types";

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export class NodeFileSystemDirectoryHandle extends NodeFileSystemHandle {
  constructor (
    protected readonly fs: NodeFsaFs,
    protected readonly path: string,
    protected readonly ctx: Partial<NodeFsaContext> = createCtx(ctx),
  ) {
    super('directory', basename(path, ctx.separator!));
  }

  /**
   * Returns a new array iterator containing the keys for each item in
   * {@link NodeFileSystemDirectoryHandle} object.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
   */
  public async * keys(): AsyncIterableIterator<string> {
    const list = await this.fs.promises.readdir(this.path);
    for (const name of list) yield name;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
   */
  public async * entries(): AsyncIterableIterator<[string, NodeFileSystemHandle]> {
    const {path, fs, ctx} = this;
    const list = await fs.promises.readdir(path, {withFileTypes: true});
    for (const dirent of list) {
      const name = dirent.name;
      const newPath = path + ctx.separator! + name;
      if (dirent.isDirectory()) yield [name, new NodeFileSystemDirectoryHandle(fs, newPath, ctx)];
      else if (dirent.isFile()) yield [name, new NodeFileSystemFileHandle(fs, name, ctx)];
    }
  }

  /**
   * Returns a new array iterator containing the values for each index in the
   * {@link FileSystemDirectoryHandle} object.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
   */
  public async * values(): AsyncIterableIterator<NodeFileSystemHandle> {
    for await (const [, value] of this.entries()) yield value;
  }

  /**
   * Returns a {@link NodeFileSystemDirectoryHandle} for a subdirectory with the specified
   * name within the directory handle on which the method is called.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
   * @param name A string representing the {@link NodeFileSystemHandle} name of
   *        the subdirectory you wish to retrieve.
   * @param options An optional object containing options for the retrieved
   *        subdirectory.
   */
  public async getDirectoryHandle(name: string, options?: GetDirectoryHandleOptions): Promise<NodeFileSystemDirectoryHandle> {
    assertName(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
    const filename = this.path + this.ctx.separator! + name;
    try {
      const stats = await this.fs.promises.stat(filename);
      if (!stats.isDirectory()) throw newTypeMismatchError();
      return new NodeFileSystemDirectoryHandle(this.fs, filename, this.ctx);
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'ENOENT': {
            if (options && options.create) {
              await this.fs.promises.mkdir(filename);
              return new NodeFileSystemDirectoryHandle(this.fs, filename, this.ctx);
            }
            throw newNotFoundError();
          }
          case 'EPERM':
          case 'EACCES':
            throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  /**
   * Returns a {@link FileSystemFileHandle} for a file with the specified name,
   * within the directory the method is called.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
   * @param name A string representing the {@link NodeFileSystemHandle} name of
   *        the file you wish to retrieve.
   * @param options An optional object containing options for the retrieved file.
   */
  public async getFileHandle(name: string, options?: GetFileHandleOptions): Promise<NodeFileSystemFileHandle> {
    assertName(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
    const filename = this.path + this.ctx.separator! + name;
    try {
      const stats = await this.fs.promises.stat(filename);
      if (!stats.isFile()) throw newTypeMismatchError();
      return new NodeFileSystemFileHandle(this.fs, filename, this.ctx);
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'ENOENT': {
            if (options && options.create) {
              await this.fs.promises.writeFile(filename, '');
              return new NodeFileSystemFileHandle(this.fs, filename, this.ctx);
            }
            throw newNotFoundError();
          }
          case 'EPERM':
          case 'EACCES':
            throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
   * @param name A string representing the {@link FileSystemHandle} name of the
   *        entry you wish to remove.
   * @param options An optional object containing options.
   */
  public removeEntry(name: string, options?: RemoveEntryOptions): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * The `resolve()` method of the {@link FileSystemDirectoryHandle} interface
   * returns an {@link Array} of directory names from the parent handle to the specified
   * child entry, with the name of the child entry as the last array item.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/resolve
   * @param possibleDescendant The {@link NodeFileSystemFileHandle} from which
   *        to return the relative path.
   */
  public resolve(possibleDescendant: NodeFileSystemHandle): Promise<string[] | null> {
    throw new Error('Not implemented');
  }
}

export interface GetDirectoryHandleOptions {
  /**
   * A boolean value, which defaults to `false`. When set to `true` if the directory
   * is not found, one with the specified name will be created and returned.
   */
  create?: boolean;
}

export interface GetFileHandleOptions {
  /**
   * A Boolean. Default `false`. When set to `true` if the file is not found,
   * one with the specified name will be created and returned.
   */
  create?: boolean;
}

export interface RemoveEntryOptions {
  /**
   * A boolean value, which defaults to `false`. When set to true entries will
   * be removed recursively.
   */
  recursive?: boolean;
}
