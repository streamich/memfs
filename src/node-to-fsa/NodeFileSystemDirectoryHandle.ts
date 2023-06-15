import { NodeFileSystemHandle } from './NodeFileSystemHandle';
import {
  assertName,
  basename,
  ctx as createCtx,
  newNotAllowedError,
  newNotFoundError,
  newTypeMismatchError,
} from './util';
import { NodeFileSystemFileHandle } from './NodeFileSystemFileHandle';
import type { NodeFsaContext, NodeFsaFs } from './types';
import type Dirent from '../Dirent';
import type {GetDirectoryHandleOptions, GetFileHandleOptions, IFileSystemDirectoryHandle, IFileSystemFileHandle, RemoveEntryOptions} from '../fsa/types';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export class NodeFileSystemDirectoryHandle extends NodeFileSystemHandle implements IFileSystemDirectoryHandle {
  protected readonly ctx: Partial<NodeFsaContext>;
  constructor(protected readonly fs: NodeFsaFs, public readonly __path: string, ctx: Partial<NodeFsaContext> = {}) {
    super('directory', basename(__path, ctx.separator || '/'));
    this.ctx = createCtx(ctx);
  }

  /**
   * Returns a new array iterator containing the keys for each item in
   * {@link NodeFileSystemDirectoryHandle} object.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
   */
  public async *keys(): AsyncIterableIterator<string> {
    const list = await this.fs.promises.readdir(this.__path);
    for (const name of list) yield '' + name;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
   */
  public async *entries(): AsyncIterableIterator<[string, NodeFileSystemHandle]> {
    const { __path: path, fs, ctx } = this;
    const list = await fs.promises.readdir(path, { withFileTypes: true });
    for (const d of list) {
      const dirent = d as Dirent;
      const name = dirent.name + '';
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
  public async *values(): AsyncIterableIterator<NodeFileSystemHandle> {
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
  public async getDirectoryHandle(
    name: string,
    options?: GetDirectoryHandleOptions,
  ): Promise<IFileSystemDirectoryHandle> {
    assertName(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
    const filename = this.__path + this.ctx.separator! + name;
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
  public async getFileHandle(name: string, options?: GetFileHandleOptions): Promise<IFileSystemFileHandle> {
    assertName(name, 'getFileHandle', 'FileSystemDirectoryHandle');
    const filename = this.__path + this.ctx.separator! + name;
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
   * Attempts to remove an entry if the directory handle contains a file or
   * directory called the name specified.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
   * @param name A string representing the {@link FileSystemHandle} name of the
   *        entry you wish to remove.
   * @param options An optional object containing options.
   */
  public async removeEntry(name: string, { recursive = false }: RemoveEntryOptions = {}): Promise<void> {
    assertName(name, 'removeEntry', 'FileSystemDirectoryHandle');
    const filename = this.__path + this.ctx.separator! + name;
    const promises = this.fs.promises;
    try {
      const stats = await promises.stat(filename);
      if (stats.isFile()) {
        await promises.unlink(filename);
      } else if (stats.isDirectory()) {
        await promises.rmdir(filename, { recursive });
      } else throw newTypeMismatchError();
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case 'ENOENT': {
            throw newNotFoundError();
          }
          case 'EPERM':
          case 'EACCES':
            throw newNotAllowedError();
          case 'ENOTEMPTY':
            throw new DOMException('The object can not be modified in this way.', 'InvalidModificationError');
        }
      }
      throw error;
    }
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
  public async resolve(possibleDescendant: NodeFileSystemHandle): Promise<string[] | null> {
    if (
      possibleDescendant instanceof NodeFileSystemDirectoryHandle ||
      possibleDescendant instanceof NodeFileSystemFileHandle
    ) {
      const path = this.__path;
      const childPath = possibleDescendant.__path;
      if (!childPath.startsWith(path)) return null;
      let relative = childPath.slice(path.length);
      if (relative === '') return [];
      const separator = this.ctx.separator!;
      if (relative[0] === separator) relative = relative.slice(1);
      return relative.split(separator);
    }
    return null;
  }
}
