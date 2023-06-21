import type { FsCommonObjects } from '../types/FsCommonObjects';

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
