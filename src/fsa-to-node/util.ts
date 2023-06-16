import {FsaToNodeConstants} from "./constants";;
import type {FsLocation} from "./types";

export const pathToLocation = (path: string): FsLocation => {
  if (path[0] === FsaToNodeConstants.Separator) path = path.slice(1);
  const lastSlashIndex = path.lastIndexOf(FsaToNodeConstants.Separator);
  if (lastSlashIndex === -1) return [[], path];
  const file = path.slice(lastSlashIndex + 1);
  const folder = path.slice(0, lastSlashIndex).split(FsaToNodeConstants.Separator);
  return [folder, file];
};
