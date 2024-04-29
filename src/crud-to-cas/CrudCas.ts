import { hashToLocation } from './util';
import { CrudCasBase } from './CrudCasBase';
import type { CrudApi } from '../crud/types';

export interface CrudCasOptions {
  hash: (blob: Uint8Array) => Promise<string>;
}

const hashEqual = (h1: string, h2: string) => h1 === h2;

export class CrudCas extends CrudCasBase<string> {
  constructor(
    protected readonly crud: CrudApi,
    protected readonly options: CrudCasOptions,
  ) {
    super(crud, options.hash, hashToLocation, hashEqual);
  }
}
