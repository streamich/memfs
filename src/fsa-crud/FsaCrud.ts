import type * as crud from '../crud/types';
import type * as fsa from '../fsa/types';
import {assertName} from '../node-to-fsa/util';
import {assertType} from './util';

export class FsaCrud implements crud.CrudApi {
  public constructor (protected readonly root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>) {}

  protected async getDir(collection: crud.CrudCollection, create: boolean): Promise<fsa.IFileSystemDirectoryHandle> {
    let dir = await this.root;
    try {
      for (const name of collection)
        dir = await dir.getDirectoryHandle(name, {create});
      return dir;
    } catch (error) {
      if (error.name === 'NotFoundError')
        throw new DOMException(`Collection /${collection.join('/')} does not exist`, 'CollectionNotFound');
      throw error;
    }
  }

  protected async getFile(collection: crud.CrudCollection, id: string): Promise<[dir: fsa.IFileSystemDirectoryHandle, file: fsa.IFileSystemFileHandle]> {
    const dir = await this.getDir(collection, false);
    try {
      const file = await dir.getFileHandle(id, {create: false});
      return [dir, file];
    } catch (error) {
      if (error.name === 'NotFoundError')
        throw new DOMException(`Resource "${id}" in /${collection.join('/')} not found`, 'ResourceNotFound');
      throw error;
    }
  };

  public readonly put = async (collection: crud.CrudCollection, id: string, data: Uint8Array, options?: crud.CrudPutOptions): Promise<void> => {
    assertType(collection, 'put', 'crudfs');
    assertName(id, 'put', 'crudfs');
    const dir = await this.getDir(collection, true);
    let file: fsa.IFileSystemFileHandle | undefined;
    switch (options?.throwIf) {
      case 'exists': {
        try {
          file = await dir.getFileHandle(id, {create: false});
          throw new DOMException('Resource already exists', 'Exists');
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          file = await dir.getFileHandle(id, {create: true});
        }
        break;
      }
      case 'missing': {
        try {
          file = await dir.getFileHandle(id, {create: false});
        } catch (e) {
          if (e.name === 'NotFoundError') throw new DOMException('Resource is missing', 'Missing');
          throw e;
        }
        break;
      }
      default: {
        file = await dir.getFileHandle(id, {create: true});
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
    assertType(collection, 'get', 'crudfs');
    assertName(id, 'get', 'crudfs');
    try {
      const [dir] = await this.getFile(collection, id);
      await dir.removeEntry(id, {recursive: false});
    } catch (error) {
      if (!silent) throw error;
    }
  };

  public readonly info = async (collection: crud.CrudCollection, id?: string): Promise<crud.CrudResourceInfo> => {
    throw new Error('Not implemented');
  };

  public readonly drop = async (collection: crud.CrudCollection): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly list = async (collection: crud.CrudCollection): Promise<crud.CrudTypeEntry[]> => {
    throw new Error('Not implemented');
  };

  public readonly scan = async (collection: crud.CrudCollection, cursor?: string | ''): Promise<crud.CrudScanResult> => {
    throw new Error('Not implemented');
  };
}
