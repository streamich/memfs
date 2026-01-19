import type { FsCommonObjects } from '@jsonjoy.com/node-fs-utils';

export const fsCommonObjectsList: Array<keyof FsCommonObjects> = [
  'F_OK',
  'R_OK',
  'W_OK',
  'X_OK',
  'constants',
  'Stats',
  'StatFs',
  'Dir',
  'Dirent',
  'StatsWatcher',
  'FSWatcher',
  'ReadStream',
  'WriteStream',
];
