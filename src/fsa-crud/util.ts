import {CrudType} from "../crud/types";
import {assertName} from "../node-to-fsa/util";

export const assertType = (type: CrudType, method: string, klass: string): void => {
  const length = type.length;
  for (let i = 0; i < length; i++) assertName(type[i], method, klass);
};
