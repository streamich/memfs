import type { CrudApi } from '../types';
export type Setup = () => {
    crud: CrudApi;
    snapshot: () => Record<string, string | null>;
};
export declare const testCrudfs: (setup: Setup) => void;
