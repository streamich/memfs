import type {Code} from './types';

/**
 * Executes only one instance of give code at a time. If other calls come in in
 * parallel, they get resolved to the result of the ongoing execution.
 */
export const codeMutex = <T>() => {
  let result: Promise<T> | undefined;
  return async (code: Code<T>): Promise<T> => {
    if (result) return result;
    try {
      return await (result = code());
    } finally {
      result = undefined;
    }
  };
};
