import type { constants } from '../../constants';
import type * as misc from './misc';

export interface FsCommonObjects {
  F_OK: number;
  R_OK: number;
  W_OK: number;
  X_OK: number;
  constants: typeof constants;
  Stats: new (...args: unknown[]) => misc.IStats;
  StatFs: unknown;
  Dir: unknown;
  Dirent: new (...args: unknown[]) => misc.IDirent;
  StatsWatcher: new (...args: unknown[]) => misc.IStatWatcher;
  FSWatcher: new (...args: unknown[]) => misc.IFSWatcher;
  ReadStream: new (...args: unknown[]) => misc.IReadStream;
  WriteStream: new (...args: unknown[]) => misc.IWriteStream;
}
