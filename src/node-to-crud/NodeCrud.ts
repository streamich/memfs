import { assertName } from '../node-to-fsa/util';
import { assertType } from '../crud/util';
import type { FsPromisesApi } from '../node/types';
import type * as crud from '../crud/types';

export interface NodeCrudOptions {
  fs: FsPromisesApi;
  dir: string;
  separator?: string;
}

export class NodeCrud implements crud.CrudApi {
  public constructor(
    options: NodeCrudOptions,
  ) {}

  // protected async getDir(
  //   collection: crud.CrudCollection,
  //   create: boolean,
  // ): Promise<[dir: fsa.IFileSystemDirectoryHandle, parent: fsa.IFileSystemDirectoryHandle | undefined]> {
  //   let parent: undefined | fsa.IFileSystemDirectoryHandle = undefined;
  //   let dir = await this.root;
  //   try {
  //     for (const name of collection) {
  //       const child = await dir.getDirectoryHandle(name, { create });
  //       parent = dir;
  //       dir = child;
  //     }
  //     return [dir, parent];
  //   } catch (error) {
  //     if (error.name === 'NotFoundError')
  //       throw new DOMException(`Collection /${collection.join('/')} does not exist`, 'CollectionNotFound');
  //     throw error;
  //   }
  // }

  // protected async getFile(
  //   collection: crud.CrudCollection,
  //   id: string,
  // ): Promise<[dir: fsa.IFileSystemDirectoryHandle, file: fsa.IFileSystemFileHandle]> {
  //   const [dir] = await this.getDir(collection, false);
  //   try {
  //     const file = await dir.getFileHandle(id, { create: false });
  //     return [dir, file];
  //   } catch (error) {
  //     if (error.name === 'NotFoundError')
  //       throw new DOMException(`Resource "${id}" in /${collection.join('/')} not found`, 'ResourceNotFound');
  //     throw error;
  //   }
  // }

  public readonly put = async (
    collection: crud.CrudCollection,
    id: string,
    data: Uint8Array,
    options?: crud.CrudPutOptions,
  ): Promise<void> => {
    assertType(collection, 'put', 'crudfs');
    assertName(id, 'put', 'crudfs');
    throw new Error('Not implemented');
    // const [dir] = await this.getDir(collection, true);
    // let file: fsa.IFileSystemFileHandle | undefined;
    // switch (options?.throwIf) {
    //   case 'exists': {
    //     try {
    //       file = await dir.getFileHandle(id, { create: false });
    //       throw new DOMException('Resource already exists', 'Exists');
    //     } catch (e) {
    //       if (e.name !== 'NotFoundError') throw e;
    //       file = await dir.getFileHandle(id, { create: true });
    //     }
    //     break;
    //   }
    //   case 'missing': {
    //     try {
    //       file = await dir.getFileHandle(id, { create: false });
    //     } catch (e) {
    //       if (e.name === 'NotFoundError') throw new DOMException('Resource is missing', 'Missing');
    //       throw e;
    //     }
    //     break;
    //   }
    //   default: {
    //     file = await dir.getFileHandle(id, { create: true });
    //   }
    // }
    // const writable = await file!.createWritable();
    // await writable.write(data);
    // await writable.close();
  };

  public readonly get = async (collection: crud.CrudCollection, id: string): Promise<Uint8Array> => {
    assertType(collection, 'get', 'crudfs');
    assertName(id, 'get', 'crudfs');
    throw new Error('Not implemented');
    // const [, file] = await this.getFile(collection, id);
    // const blob = await file.getFile();
    // const buffer = await blob.arrayBuffer();
    // return new Uint8Array(buffer);
  };

  public readonly del = async (collection: crud.CrudCollection, id: string, silent?: boolean): Promise<void> => {
    assertType(collection, 'del', 'crudfs');
    assertName(id, 'del', 'crudfs');
    throw new Error('Not implemented');
    // try {
    //   const [dir] = await this.getFile(collection, id);
    //   await dir.removeEntry(id, { recursive: false });
    // } catch (error) {
    //   if (!silent) throw error;
    // }
  };

  public readonly info = async (collection: crud.CrudCollection, id?: string): Promise<crud.CrudResourceInfo> => {
    assertType(collection, 'info', 'crudfs');
    throw new Error('Not implemented');
    // if (id) {
    //   assertName(id, 'info', 'crudfs');
    //   const [, file] = await this.getFile(collection, id);
    //   const blob = await file.getFile();
    //   return {
    //     type: 'resource',
    //     id,
    //     size: blob.size,
    //     modified: blob.lastModified,
    //   };
    // } else {
    //   await this.getDir(collection, false);
    //   return {
    //     type: 'collection',
    //     id: '',
    //   };
    // }
  };

  public readonly drop = async (collection: crud.CrudCollection, silent?: boolean): Promise<void> => {
    assertType(collection, 'drop', 'crudfs');
    throw new Error('Not implemented');
    // try {
    //   const [dir, parent] = await this.getDir(collection, false);
    //   if (parent) {
    //     await parent.removeEntry(dir.name, { recursive: true });
    //   } else {
    //     const root = await this.root;
    //     for await (const name of root.keys()) await root.removeEntry(name, { recursive: true });
    //   }
    // } catch (error) {
    //   if (!silent) throw error;
    // }
  };

  public readonly list = async (collection: crud.CrudCollection): Promise<crud.CrudCollectionEntry[]> => {
    assertType(collection, 'drop', 'crudfs');
    throw new Error('Not implemented');
    // const [dir] = await this.getDir(collection, false);
    // const entries: crud.CrudCollectionEntry[] = [];
    // for await (const [id, handle] of dir.entries()) {
    //   if (handle.kind === 'file') {
    //     entries.push({
    //       type: 'resource',
    //       id,
    //     });
    //   } else if (handle.kind === 'directory') {
    //     entries.push({
    //       type: 'collection',
    //       id,
    //     });
    //   }
    // }
    // return entries;
  };
}
