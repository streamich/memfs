import {NodeFileSystemHandle} from "./NodeFileSystemHandle";
import {basename} from "./util";
import type {FsaNodeFs} from "./types";

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
export class NodeFileSystemDirectoryHandle extends NodeFileSystemHandle {
  constructor (
    protected readonly fs: FsaNodeFs,
    protected readonly path: string,
  ) {
    super('directory', basename(path));
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
   */
  public entries(): AsyncIterableIterator<[string, NodeFileSystemHandle]> {
    throw new Error('Not implemented');
  }

  /**
   * Returns a new array iterator containing the keys for each item in
   * {@link NodeFileSystemDirectoryHandle} object.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
   */
  public keys(): AsyncIterableIterator<string> {
    const {path, fs} = this;
    return (async function*() {
      const list = await fs.promises.readdir(path);
      for (const name of list) yield name;
    })();
  }

  /**
   * Returns a new array iterator containing the values for each index in the
   * {@link FileSystemDirectoryHandle} object.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
   */
  public values(): AsyncIterableIterator<NodeFileSystemHandle> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
   * @param name A string representing the {@link NodeFileSystemHandle} name of
   *        the subdirectory you wish to retrieve.
   * @param options An optional object containing options for the retrieved
   *        subdirectory.
   */
  public getDirectoryHandle(name: string, options?: GetDirectoryHandleOptions): Promise<NodeFileSystemDirectoryHandle> {
    throw new Error('Not implemented');
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
   * @param name A string representing the {@link NodeFileSystemHandle} name of
   *        the file you wish to retrieve.
   * @param options An optional object containing options for the retrieved file.
   */
  public getFileHandle(name: string, options?: GetFileHandleOptions): Promise<NodeFileSystemDirectoryHandle> {
    throw new Error('Not implemented');
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
