import { CrudCollection } from './types';
import { assertName } from '../node-to-fsa/util';

export const assertType = (type: CrudCollection, method: string, klass: string): void => {
  const length = type.length;
  for (let i = 0; i < length; i++) assertName(type[i], method, klass);
};
