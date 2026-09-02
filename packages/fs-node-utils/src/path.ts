import { sep, join, relative, dirname, normalize, posix } from '@jsonjoy.com/fs-node-builtins/lib/path';

export const pathSep = posix ? posix.sep : sep;
export const pathJoin = posix ? posix.join : join;
export const pathRelative = posix ? posix.relative : relative;
export const pathDirname = posix ? posix.dirname : dirname;
export const pathNormalize = posix ? posix.normalize : normalize;

export const basename = (path: string, separator: string) => {
  if (path[path.length - 1] === separator) path = path.slice(0, -1);
  const lastSlashIndex = path.lastIndexOf(separator);
  return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};
