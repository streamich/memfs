import { Buffer } from '../vendor/node/internal/buffer';
import { join, posix } from '../vendor/node/path';

const pathJoin = posix ? posix.join : join;

export type DirectoryContent = string | Buffer | null;

export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T;
}
export interface NestedDirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T | NestedDirectoryJSON;
}

export const flattenJSON = (nestedJSON: NestedDirectoryJSON): DirectoryJSON => {
  const flatJSON: DirectoryJSON = {};
  function flatten(pathPrefix: string, node: NestedDirectoryJSON) {
    for (const path in node) {
      const contentOrNode = node[path];
      // TODO: Can we avoid using `join` here? Just concatenate?
      const joinedPath = pathJoin(pathPrefix, path);
      if (typeof contentOrNode === 'string' || contentOrNode instanceof Buffer) {
        flatJSON[joinedPath] = contentOrNode;
      } else if (
        typeof contentOrNode === 'object' &&
        contentOrNode !== null &&
        !(contentOrNode instanceof Buffer) &&
        Object.keys(contentOrNode).length > 0
      ) {
        // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered
        flatten(joinedPath, contentOrNode as NestedDirectoryJSON<DirectoryContent>);
      } else {
        // without this branch null, empty-object or non-object entries would not be handled in the same way
        // by both fromJSON() and fromNestedJSON()
        flatJSON[joinedPath] = null;
      }
    }
  }
  flatten('', nestedJSON);
  return flatJSON;
};
