import type { CasApi } from '../../cas/types';
import type { CrudApi } from '../../crud/types';
export declare const hash: (blob: Uint8Array) => Promise<string>;
export type Setup = () => {
    cas: CasApi;
    crud: CrudApi;
    snapshot: () => Record<string, string | null>;
};
export declare const testCasfs: (setup: Setup) => void;
