import type * as crud from '../crud/types';
import type * as fsa from '../fsa/types';
import {assertName} from '../node-to-fsa/util';
import {assertType} from './util';

export class FsaCrud implements crud.CrudApi {
  public constructor (protected readonly root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>) {}

  protected async getDir(type: crud.CrudType): Promise<fsa.IFileSystemDirectoryHandle> {
    let dir = await this.root;
    for (const name of type)
      dir = await dir.getDirectoryHandle(name, {create: true});
    return dir;
  }

  public readonly put = async (type: crud.CrudType, id: string, data: Uint8Array, options?: crud.CrudPutOptions): Promise<void> => {
    assertType(type, 'put', 'crudfs');
    assertName(id, 'put', 'crudfs');
    const dir = await this.getDir(type);
    let file: fsa.IFileSystemFileHandle | undefined;
    switch (options?.throwIf) {
      case 'exists': {
        try {
          file = await dir.getFileHandle(id, {create: false});
          throw new DOMException('Resource already exists', 'ExistsError');
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
          if (e.name === 'NotFoundError') throw new DOMException('Resource is missing', 'MissingError');
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

  public readonly get = async (type: crud.CrudType, id: string): Promise<Uint8Array> => {
    throw new Error('Not implemented');
  };

  public readonly del = async (type: crud.CrudType, id: string): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly info = async (type: crud.CrudType, id?: string): Promise<crud.CrudResourceInfo> => {
    throw new Error('Not implemented');
  };

  public readonly drop = async (type: crud.CrudType): Promise<void> => {
    throw new Error('Not implemented');
  };

  public readonly list = async (type: crud.CrudType): Promise<crud.CrudTypeEntry[]> => {
    throw new Error('Not implemented');
  };

  public readonly scan = async (type: crud.CrudType, cursor?: string | ''): Promise<crud.CrudScanResult> => {
    throw new Error('Not implemented');
  };
}
