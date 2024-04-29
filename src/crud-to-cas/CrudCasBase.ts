import type { CasApi, CasGetOptions } from '../cas/types';
import type { CrudApi, CrudResourceInfo } from '../crud/types';
import type { FsLocation } from '../fsa-to-node/types';

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

export class CrudCasBase<Hash> implements CasApi<Hash> {
  constructor(
    protected readonly crud: CrudApi,
    protected readonly hash: (blob: Uint8Array) => Promise<Hash>,
    protected readonly hash2Loc: (hash: Hash) => FsLocation,
    protected readonly hashEqual: (h1: Hash, h2: Hash) => boolean,
  ) {}

  public readonly put = async (blob: Uint8Array): Promise<Hash> => {
    const digest = await this.hash(blob);
    const [collection, resource] = this.hash2Loc(digest);
    await this.crud.put(collection, resource, blob);
    return digest;
  };

  public readonly get = async (hash: Hash, options?: CasGetOptions): Promise<Uint8Array> => {
    const [collection, resource] = this.hash2Loc(hash);
    return await normalizeErrors(async () => {
      const blob = await this.crud.get(collection, resource);
      if (!options?.skipVerification) {
        const digest = await this.hash(blob);
        if (!this.hashEqual(digest, hash)) throw new DOMException('Blob contents does not match hash', 'Integrity');
      }
      return blob;
    });
  };

  public readonly del = async (hash: Hash, silent?: boolean): Promise<void> => {
    const [collection, resource] = this.hash2Loc(hash);
    await normalizeErrors(async () => {
      return await this.crud.del(collection, resource, silent);
    });
  };

  public readonly info = async (hash: Hash): Promise<CrudResourceInfo> => {
    const [collection, resource] = this.hash2Loc(hash);
    return await normalizeErrors(async () => {
      return await this.crud.info(collection, resource);
    });
  };
}
