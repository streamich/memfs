import { hashToLocation } from './util';
import type { CasApi } from '../cas/types';
import type { CrudApi, CrudResourceInfo } from '../crud/types';

export interface CrudCasOptions {
  hash: (blob: Uint8Array) => Promise<string>;
}

const normalizeErrors = async <T>(code: () => Promise<T>): Promise<T> => {
  try {
    return await code();
  } catch (error) {
    if (error && typeof error === 'object') {
      switch (error.name) {
        case 'ResourceNotFound':
        case 'CollectionNotFound':
          throw new DOMException(error.message, 'BlobNotFound');
      }
    }
    throw error;
  }
};

export class CrudCas implements CasApi {
  constructor(protected readonly crud: CrudApi, protected readonly options: CrudCasOptions) {}

  public readonly put = async (blob: Uint8Array): Promise<string> => {
    const digest = await this.options.hash(blob);
    const [collection, resource] = hashToLocation(digest);
    await this.crud.put(collection, resource, blob);
    return digest;
  };

  public readonly get = async (hash: string): Promise<Uint8Array> => {
    const [collection, resource] = hashToLocation(hash);
    return await normalizeErrors(async () => {
      return await this.crud.get(collection, resource);
    });
  };

  public readonly del = async (hash: string, silent?: boolean): Promise<void> => {
    const [collection, resource] = hashToLocation(hash);
    await normalizeErrors(async () => {
      return await this.crud.del(collection, resource, silent);
    });
  };

  public readonly info = async (hash: string): Promise<CrudResourceInfo> => {
    const [collection, resource] = hashToLocation(hash);
    return await normalizeErrors(async () => {
      return await this.crud.info(collection, resource);
    });
  };
}
