import type {Code} from './types';

/** Executes code concurrently. */
export const go = <T>(code: Code<T>): void => {
  code().catch(() => {});
};
