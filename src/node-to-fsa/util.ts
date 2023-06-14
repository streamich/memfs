import type {NodeFsaContext} from "./types";

/**
 * Creates a new {@link NodeFsaContext}.
 */
export const ctx = (partial: Partial<NodeFsaContext> = {}): NodeFsaContext => {
  return {
    ...partial,
    separator: '/',
  };
};

export const basename = (path: string, separator: string) => {
  const lastSlashIndex = path.lastIndexOf(separator);
  return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};

const nameRegex = /^(\.{1,2})|(.*(\/|\\).*)$/;

export const assertName = (name: string, method: string, klass: string) => {
  const isInvalid = nameRegex.test(name);
  if (isInvalid) throw new TypeError(`Failed to execute '${method}' on '${klass}': Name is not allowed.`);
};
