import { DenoFileInfo } from './types';

export class CoreFileInfo implements DenoFileInfo {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: Date | null;
  atime: Date | null;
  birthtime: Date | null;
  ctime: Date | null;
  dev: number;
  ino: number | null;
  mode: number | null;
  nlink: number | null;
  uid: number | null;
  gid: number | null;
  rdev: number | null;
  blksize: number | null;
  blocks: number | null;
  isBlockDevice: boolean | null;
  isCharDevice: boolean | null;
  isFifo: boolean | null;
  isSocket: boolean | null;

  constructor(stats: Partial<DenoFileInfo> = {}) {
    this.isFile = stats.isFile ?? false;
    this.isDirectory = stats.isDirectory ?? false;
    this.isSymlink = stats.isSymlink ?? false;
    this.size = stats.size ?? 0;
    this.mtime = stats.mtime ?? null;
    this.atime = stats.atime ?? null;
    this.birthtime = stats.birthtime ?? null;
    this.ctime = stats.ctime ?? null;
    this.dev = stats.dev ?? 0;
    this.ino = stats.ino ?? null;
    this.mode = stats.mode ?? null;
    this.nlink = stats.nlink ?? null;
    this.uid = stats.uid ?? null;
    this.gid = stats.gid ?? null;
    this.rdev = stats.rdev ?? null;
    this.blksize = stats.blksize ?? null;
    this.blocks = stats.blocks ?? null;
    this.isBlockDevice = stats.isBlockDevice ?? null;
    this.isCharDevice = stats.isCharDevice ?? null;
    this.isFifo = stats.isFifo ?? null;
    this.isSocket = stats.isSocket ?? null;
  }
}