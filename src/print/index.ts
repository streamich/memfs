import { printTree } from 'tree-dump';
import { basename } from '../node-to-fsa/util';
import type { FsSynchronousApi } from '../node/types';
import type { IDirent } from '../node/types/misc';

export const toTreeSync = (fs: FsSynchronousApi, opts: ToTreeOptions = {}) => {
  const separator = opts.separator || '/';
  let dir = opts.dir || separator;
  if (dir[dir.length - 1] !== separator) dir += separator;
  const tab = opts.tab || '';
  const depth = opts.depth ?? 10;
  let subtree = ' (...)';
  if (depth > 0) {
    const list = fs.readdirSync(dir, { withFileTypes: true }) as IDirent[];
    subtree = printTree(
      tab,
      list.map(entry => tab => {
        if (entry.isDirectory()) {
          return toTreeSync(fs, { dir: dir + entry.name, depth: depth - 1, tab });
        } else if (entry.isSymbolicLink()) {
          return '' + entry.name + ' → ' + fs.readlinkSync(dir + entry.name);
        } else {
          return '' + entry.name;
        }
      }),
    );
  }
  const base = basename(dir, separator) + separator;
  return base + subtree;
};

export interface ToTreeOptions {
  dir?: string;
  tab?: string;
  depth?: number;
  separator?: '/' | '\\';
}
