import { Superblock } from '../core';
import type { IStatFs } from './types/misc';

export type TStatNumber = number | bigint;

/**
 * Statistics about a file system, like `fs.StatFs`.
 */
export class StatFs<T = TStatNumber> implements IStatFs<T> {
  static build(superblock: Superblock, bigint: false): StatFs<number>;
  static build(superblock: Superblock, bigint: true): StatFs<bigint>;
  static build(superblock: Superblock, bigint?: boolean): StatFs<TStatNumber>;
  static build(superblock: Superblock, bigint: boolean = false): StatFs<TStatNumber> {
    const statfs = new StatFs<TStatNumber>();

    const getStatNumber = !bigint ? number => number : number => BigInt(number);

    // For in-memory filesystem, provide mock but reasonable values
    // Magic number for in-memory filesystem type (similar to ramfs)
    statfs.type = getStatNumber(0x858458f6);

    // Optimal transfer block size - commonly 4096 bytes
    statfs.bsize = getStatNumber(4096);

    // Calculate filesystem stats based on current state
    const totalInodes = Object.keys(superblock.inodes).length;

    // Mock large filesystem capacity (appears as a large filesystem to applications)
    const totalBlocks = 1000000;
    const usedBlocks = Math.min(totalInodes * 2, totalBlocks); // Rough estimation
    const freeBlocks = totalBlocks - usedBlocks;

    statfs.blocks = getStatNumber(totalBlocks); // Total data blocks
    statfs.bfree = getStatNumber(freeBlocks); // Free blocks in file system
    statfs.bavail = getStatNumber(freeBlocks); // Free blocks available to unprivileged users

    // File node statistics
    const maxFiles = 1000000; // Mock large number of available inodes
    statfs.files = getStatNumber(maxFiles); // Total file nodes in file system
    statfs.ffree = getStatNumber(maxFiles - totalInodes); // Free file nodes

    return statfs;
  }

  type: T;
  bsize: T;
  blocks: T;
  bfree: T;
  bavail: T;
  files: T;
  ffree: T;
}

export default StatFs;
