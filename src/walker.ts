import type { Node, Link, File } from './node';
import { createError } from './node/util';

const ENOENT = 'ENOENT';
const EACCES = 'EACCES';

export interface IVisitor {
  (link: Link | null, step: string): Link | null
}


/**
 * Helper class that models different ways to walk a directory (sub-)tree, visiting each link and subjecting 
 * it to a sequence of functions.
 */
export default class Walker {
  private fns: IVisitor[];
  /**
   * Construct a `Walker` instance that subjects each visited link to the given functions when walking.
   * Functions will be bound to the walker instance when called.
   */
  constructor(...fns: IVisitor[]) {
    this.fns = fns.map((fn: IVisitor): IVisitor => fn.bind(this));
  }

  /**
   * Select the child given in `step` from the `link`.
   * If `step` is the empty string, or `link` is not defined, return `link` itself.
   * Returns `null` if there is no such child for `link`.
   */
  static step(link: Link | null, step: string): Link | null {
   if (step === '' || !link) return link;
    return link.getChild(step) ?? null;
  }

  /**
   * Check that `link` exists. Throws `ENOENT` if it doesn't.
   * Returns `link`.
   */
  static checkExistence(link: Link | null, filename: string, funcName?: string): Link {
    if (!link) throw createError(ENOENT, funcName, filename);
    return link;
  }

  /**
   * If `link` is a directory, checks that access permissions are granted. Throws `EACCES` otherwise.
   * Returns `link`.
   */
  static checkAccess(link: Link, filename: string, funcName?: string): Link {
    const node = link.getNode();
    if (node.isDirectory() && !node.canExecute())
      throw createError(EACCES, funcName, filename);
    return link;
  }
  
  /**
   * If `link` is a symlink, resolves it and returns the symlink target. 
   * Otherwise returns `link`.
   */
  static resolveSymlink(link: Link | null): Link | null {
    const node = link?.getNode();
    if (node && node.isSymlink()) {
      return (this as unknown as Walker).walk(link!.vol.root, node.symlink);
    }
    return link;
  }

  /** 
   * Walk from `root` the path given by `steps`, subjecting each visited link to this walker's functions.
   */
  walk(root: Link, steps: string[]): Link | null {
    let link: Link | null = root;

    for (let step of steps) {
      for (let fn of this.fns) {
        link = fn(link, step);
      }
    }
    return link;
  }
}