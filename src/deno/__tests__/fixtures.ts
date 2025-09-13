import {DirectoryJSON, Superblock} from "../../core";
import {CoreDeno} from "../CoreDeno";

export const setupDeno = (json: DirectoryJSON = {}) => {
  const core = Superblock.fromJSON(json, '/');
  const deno = new CoreDeno(core);
  return { deno, core };
};
