import type { CrudResourceInfo } from '../crud/types';
export interface CasApi {
    put(blob: Uint8Array): Promise<string>;
    get(hash: string, options?: CasGetOptions): Promise<Uint8Array>;
    del(hash: string, silent?: boolean): Promise<void>;
    info(hash: string): Promise<CrudResourceInfo>;
}
export interface CasGetOptions {
    skipVerification?: boolean;
}
