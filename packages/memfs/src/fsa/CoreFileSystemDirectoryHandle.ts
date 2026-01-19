import { CoreFileSystemHandle } from './CoreFileSystemHandle';
import {
  assertCanWrite,
  assertName,
  basename,
  ctx as createCtx,
  newNotAllowedError,
  newNotFoundError,
  newTypeMismatchError,
} from './util';
import { CoreFileSystemFileHandle } from './CoreFileSystemFileHandle';
import type {
  CoreFsaContext,
  GetDirectoryHandleOptions,
  GetFileHandleOptions,
  IFileSystemDirectoryHandle,
  IFileSystemFileHandle,
  IFileSystemHandle,
  RemoveEntryOptions,
} from './types';
import type { Superblock } from '@jsonjoy.com/fs-core';
import { ERROR_CODE } from '@jsonjoy.com/fs-core';
import { Buffer } from '@jsonjoy.com/node-fs-dependencies/lib/internal/buffer';
import { MODE, FLAGS } from '@jsonjoy.com/node-fs-utils';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export class CoreFileSystemDirectoryHandle extends CoreFileSystemHandle implements IFileSystemDirectoryHandle {
  protected readonly ctx: CoreFsaContext;
  /** Directory path with trailing slash. */
  public readonly __path: string;

  public constructor(
    protected readonly _core: Superblock,
    path: string,
    ctx: Partial<CoreFsaContext> = {},
  ) {
    const fullCtx = createCtx(ctx);
    super('directory', basename(path, fullCtx.separator), fullCtx);
    this.ctx = fullCtx;
    this.__path = path[path.length - 1] === this.ctx.separator ? path : path + this.ctx.separator;
  }

  /**
   * Returns a new array iterator containing the keys for each item in
   * {@link CoreFileSystemDirectoryHandle} object.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
   */
  public async *keys(): AsyncIterableIterator<string> {
    try {
      const link = this._core.getResolvedLinkOrThrow(this.__path);
      const children = link.children;
      for (const [name] of children) {
        if (name !== '.' && name !== '..') {
          yield name;
        }
      }
    } catch (error) {
      this._handleError(error, 'keys');
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
   */
  public async *entries(): AsyncIterableIterator<[string, CoreFileSystemHandle]> {
    const { __path: path, _core, ctx } = this;
    try {
      const link = _core.getResolvedLinkOrThrow(path);
      const children = link.children;
      for (const [name, childLink] of children) {
        if (name !== '.' && name !== '..' && childLink) {
          const childPath = path + name;
          const node = childLink.getNode();
          if (node.isDirectory()) {
            yield [name, new CoreFileSystemDirectoryHandle(_core, childPath, ctx)];
          } else if (node.isFile()) {
            yield [name, new CoreFileSystemFileHandle(_core, childPath, ctx)];
          }
        }
      }
    } catch (error) {
      this._handleError(error, 'entries');
    }
  }

  /**
   * Returns a new array iterator containing the values for each index in the
   * {@link FileSystemDirectoryHandle} object.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
   */
  public async *values(): AsyncIterableIterator<CoreFileSystemHandle> {
    for await (const [, value] of this.entries()) yield value;
  }

  /**
   * Returns a {@link CoreFileSystemDirectoryHandle} for a subdirectory with the specified
   * name within the directory handle on which the method is called.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
   * @param name A string representing the {@link CoreFileSystemHandle} name of
   *        the subdirectory you wish to retrieve.
   * @param options An optional object containing options for the retrieved
   *        subdirectory.
   */
  public async getDirectoryHandle(
    name: string,
    options?: GetDirectoryHandleOptions,
  ): Promise<IFileSystemDirectoryHandle> {
    assertName(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
    const filename = this.__path + name;
    try {
      const link = this._core.getResolvedLink(filename);
      if (link) {
        const node = link.getNode();
        if (!node.isDirectory()) throw newTypeMismatchError();
        return new CoreFileSystemDirectoryHandle(this._core, filename, this.ctx);
      } else {
        throw new Error('ENOENT'); // Simulate error for consistency with catch block
      }
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        if (error.code === ERROR_CODE.ENOENT || error.message === 'ENOENT') {
          if (options?.create) {
            assertCanWrite(this.ctx.mode!);
            try {
              this._core.mkdir(filename, 0o755);
              return new CoreFileSystemDirectoryHandle(this._core, filename, this.ctx);
            } catch (createError) {
              if (createError && typeof createError === 'object' && createError.code === ERROR_CODE.EACCES) {
                throw newNotAllowedError();
              }
              throw createError;
            }
          }
          throw newNotFoundError();
        }
        if (error.code === ERROR_CODE.EACCES) {
          throw newNotAllowedError();
        }
      }
      throw error;
    }
  }

  /**
   * Returns a {@link CoreFileSystemFileHandle} for a file with the specified name,
   * within the directory the method is called.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
   * @param name A string representing the {@link CoreFileSystemHandle} name of
   *        the file you wish to retrieve.
   * @param options An optional object containing options for the retrieved file.
   */
  public async getFileHandle(name: string, options?: GetFileHandleOptions): Promise<IFileSystemFileHandle> {
    assertName(name, 'getFileHandle', 'FileSystemDirectoryHandle');
    const filename = this.__path + name;
    try {
      const link = this._core.getResolvedLink(filename);
      if (link) {
        const node = link.getNode();
        if (!node.isFile()) throw newTypeMismatchError();
        return new CoreFileSystemFileHandle(this._core, filename, this.ctx);
      } else {
        throw new Error('ENOENT'); // Simulate error for consistency with catch block
      }
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        if (error.code === ERROR_CODE.ENOENT || error.message === 'ENOENT') {
          if (options?.create) {
            assertCanWrite(this.ctx.mode!);
            try {
              this._core.writeFile(filename, Buffer.alloc(0), FLAGS.w, MODE.FILE);
              return new CoreFileSystemFileHandle(this._core, filename, this.ctx);
            } catch (createError) {
              if (createError && typeof createError === 'object' && createError.code === ERROR_CODE.EACCES) {
                throw newNotAllowedError();
              }
              throw createError;
            }
          }
          throw newNotFoundError();
        }
        if (error.code === ERROR_CODE.EACCES) {
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
   * @param name A string representing the {@link CoreFileSystemHandle} name of the
   *        entry you wish to remove.
   * @param options An optional object containing options.
   */
  public async removeEntry(name: string, { recursive = false }: RemoveEntryOptions = {}): Promise<void> {
    assertCanWrite(this.ctx.mode!);
    assertName(name, 'removeEntry', 'FileSystemDirectoryHandle');
    const filename = this.__path + name;
    try {
      const link = this._core.getResolvedLinkOrThrow(filename);
      const node = link.getNode();
      if (node.isFile()) {
        this._core.unlink(filename);
      } else if (node.isDirectory()) {
        this._core.rmdir(filename, recursive);
      } else {
        throw newTypeMismatchError();
      }
    } catch (error) {
      if (error instanceof DOMException) throw error;
      if (error && typeof error === 'object') {
        switch (error.code) {
          case ERROR_CODE.ENOENT: {
            throw newNotFoundError();
          }
          case ERROR_CODE.EACCES:
            throw newNotAllowedError();
          case ERROR_CODE.ENOTEMPTY:
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
   * @param possibleDescendant The {@link CoreFileSystemHandle} from which
   *        to return the relative path.
   */
  public async resolve(possibleDescendant: IFileSystemHandle): Promise<string[] | null> {
    if (
      possibleDescendant instanceof CoreFileSystemDirectoryHandle ||
      possibleDescendant instanceof CoreFileSystemFileHandle
    ) {
      // First check if they are from the same core instance
      if ((possibleDescendant as any)._core !== this._core) return null;

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

  private _handleError(error: any, method: string): never {
    if (error instanceof DOMException) throw error;
    if (error && typeof error === 'object') {
      switch (error.code) {
        case ERROR_CODE.ENOENT:
          throw newNotFoundError();
        case ERROR_CODE.EACCES:
          throw newNotAllowedError();
      }
    }
    throw error;
  }
}
