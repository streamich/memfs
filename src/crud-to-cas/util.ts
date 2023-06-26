import type { FsLocation } from '../fsa-to-node/types';

export const hashToLocation = (hash: string): FsLocation => {
  if (hash.length < 20) throw new TypeError('Hash is too short');
  const lastTwo = hash.slice(-2);
  const twoBeforeLastTwo = hash.slice(-4, -2);
  const folder = [lastTwo, twoBeforeLastTwo];
  return [folder, hash];
};
