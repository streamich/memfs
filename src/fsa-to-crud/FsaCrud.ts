import type * as crud from '../crud/types';
import type * as fsa from '../fsa/types';
import { assertName } from '../node-to-fsa/util';
import { assertType } from '../crud/util';
import { newExistsError, newFile404Error, newFolder404Error, newMissingError } from './util';

export class FsaCrud implements crud.CrudApi {
  public constructor(
    protected readonly root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>,
  ) {}

  protected async getDir(
    collection: crud.CrudCollection,
    create: boolean,
  ): Promise<[dir: fsa.IFileSystemDirectoryHandle, parent: fsa.IFileSystemDirectoryHandle | undefined]> {
    let parent: undefined | fsa.IFileSystemDirectoryHandle = undefined;
    let dir = await this.root;
    try {
      for (const name of collection) {
        const child = await dir.getDirectoryHandle(name, { create });
        parent = dir;
        dir = child;
      }
      return [dir, parent];
    } catch (error) {
      if (error.name === 'NotFoundError') throw newFolder404Error(collection);
      throw error;
    }
  }

  protected async getFile(
    collection: crud.CrudCollection,
    id: string,
  ): Promise<[dir: fsa.IFileSystemDirectoryHandle, file: fsa.IFileSystemFileHandle]> {
    const [dir] = await this.getDir(collection, false);
    try {
      const file = await dir.getFileHandle(id, { create: false });
      return [dir, file];
    } catch (error) {
      if (error.name === 'NotFoundError') throw newFile404Error(collection, id);
      throw error;
    }
  }

  public readonly put = async (
    collection: crud.CrudCollection,
    id: string,
    data: Uint8Array,
    options?: crud.CrudPutOptions,
  ): Promise<void> => {
    assertType(collection, 'put', 'crudfs');
    assertName(id, 'put', 'crudfs');
    const [dir] = await this.getDir(collection, true);
    let file: fsa.IFileSystemFileHandle | undefined;
    switch (options?.throwIf) {
      case 'exists': {
        try {
          file = await dir.getFileHandle(id, { create: false });
          throw newExistsError();
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          file = await dir.getFileHandle(id, { create: true });
        }
        break;
      }
      case 'missing': {
        try {
          file = await dir.getFileHandle(id, { create: false });
        } catch (e) {
          if (e.name === 'NotFoundError') throw newMissingError();
          throw e;
        }
        break;
      }
      default: {
        file = await dir.getFileHandle(id, { create: true });
      }
    }
    const writable = await file!.createWritable();
    await writable.write(data);
    await writable.close();
  };

  public readonly get = async (collection: crud.CrudCollection, id: string): Promise<Uint8Array> => {
    assertType(collection, 'get', 'crudfs');
    assertName(id, 'get', 'crudfs');
    const [, file] = await this.getFile(collection, id);
    const blob = await file.getFile();
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  };

  public readonly del = async (collection: crud.CrudCollection, id: string, silent?: boolean): Promise<void> => {
    assertType(collection, 'del', 'crudfs');
    assertName(id, 'del', 'crudfs');
    try {
      const [dir] = await this.getFile(collection, id);
      await dir.removeEntry(id, { recursive: false });
    } catch (error) {
      if (!silent) throw error;
    }
  };

  public readonly info = async (collection: crud.CrudCollection, id?: string): Promise<crud.CrudResourceInfo> => {
    assertType(collection, 'info', 'crudfs');
    if (id) {
      assertName(id, 'info', 'crudfs');
      const [, file] = await this.getFile(collection, id);
      const blob = await file.getFile();
      return {
        type: 'resource',
        id,
        size: blob.size,
        modified: blob.lastModified,
      };
    } else {
      await this.getDir(collection, false);
      return {
        type: 'collection',
        id: '',
      };
    }
  };

  public readonly drop = async (collection: crud.CrudCollection, silent?: boolean): Promise<void> => {
    assertType(collection, 'drop', 'crudfs');
    try {
      const [dir, parent] = await this.getDir(collection, false);
      if (parent) {
        await parent.removeEntry(dir.name, { recursive: true });
      } else {
        const root = await this.root;
        for await (const name of root.keys()) await root.removeEntry(name, { recursive: true });
      }
    } catch (error) {
      if (!silent) throw error;
    }
  };

  public readonly scan = async function* (
    collection: crud.CrudCollection,
  ): AsyncIterableIterator<crud.CrudCollectionEntry> {
    assertType(collection, 'scan', 'crudfs');
    const [dir] = await this.getDir(collection, false);
    for await (const [id, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        yield {
          type: 'resource',
          id,
        };
      } else if (handle.kind === 'directory') {
        yield {
          type: 'collection',
          id,
        };
      }
    }
  };

  public readonly list = async (collection: crud.CrudCollection): Promise<crud.CrudCollectionEntry[]> => {
    const entries: crud.CrudCollectionEntry[] = [];
    for await (const entry of this.scan(collection)) entries.push(entry);
    return entries;
  };

  public readonly from = async (collection: crud.CrudCollection): Promise<crud.CrudApi> => {
    assertType(collection, 'from', 'crudfs');
    const [dir] = await this.getDir(collection, true);
    return new FsaCrud(dir);
  };
}
