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
