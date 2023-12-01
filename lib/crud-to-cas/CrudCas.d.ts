import type { CasApi, CasGetOptions } from '../cas/types';
import type { CrudApi, CrudResourceInfo } from '../crud/types';
export interface CrudCasOptions {
    hash: (blob: Uint8Array) => Promise<string>;
}
export declare class CrudCas implements CasApi {
    protected readonly crud: CrudApi;
    protected readonly options: CrudCasOptions;
    constructor(crud: CrudApi, options: CrudCasOptions);
    readonly put: (blob: Uint8Array) => Promise<string>;
    readonly get: (hash: string, options?: CasGetOptions) => Promise<Uint8Array>;
    readonly del: (hash: string, silent?: boolean) => Promise<void>;
    readonly info: (hash: string) => Promise<CrudResourceInfo>;
}
