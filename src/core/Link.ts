import { constants, PATH } from '../constants';
import { FanOut } from 'thingies/lib/fanout';
import type { Node } from './Node';
import type { Superblock } from './Superblock';

export interface LinkEventChildAdd {
  type: 'child:add';
  link: Link;
  parent: Link;
}

export interface LinkEventChildDelete {
  type: 'child:delete';
  link: Link;
  parent: Link;
}

export type LinkEvent = LinkEventChildAdd | LinkEventChildDelete;

const { S_IFREG } = constants;

/**
 * Represents a hard link that points to an i-node `node`.
 */
export class Link {
  public readonly changes = new FanOut<LinkEvent>();

  vol: Superblock;

  parent: Link | undefined;

  children = new Map<string, Link | undefined>();

  // Path to this node as Array: ['usr', 'bin', 'node'].
  private _steps: string[] = [];

  // "i-node" of this hard link.
  node: Node;

  // "i-node" number of the node.
  ino: number = 0;

  // Number of children.
  length: number = 0;

  name: string;

  get steps() {
    return this._steps;
  }

  // Recursively sync children steps, e.g. in case of dir rename
  set steps(val) {
    this._steps = val;
    for (const [child, link] of this.children.entries()) {
      if (child === '.' || child === '..') {
        continue;
      }
      link?.syncSteps();
    }
  }

  constructor(vol: Superblock, parent: Link | undefined, name: string) {
    this.vol = vol;
    this.parent = parent;
    this.name = name;
    this.syncSteps();
  }

  setNode(node: Node) {
    this.node = node;
    this.ino = node.ino;
  }

  getNode(): Node {
    return this.node;
  }

  createChild(name: string, node: Node = this.vol.createNode(S_IFREG | 0o666)): Link {
    const link = new Link(this.vol, this, name);
    link.setNode(node);

    if (node.isDirectory()) {
      link.children.set('.', link);
      link.getNode().nlink++;
    }

    this.setChild(name, link);

    return link;
  }

  setChild(name: string, link: Link = new Link(this.vol, this, name)): Link {
    this.children.set(name, link);
    link.parent = this;
    this.length++;

    const node = link.getNode();
    if (node.isDirectory()) {
      link.children.set('..', this);
      this.getNode().nlink++;
    }

    this.getNode().mtime = new Date();
    this.changes.emit({ type: 'child:add', link, parent: this });

    return link;
  }

  deleteChild(link: Link) {
    const node = link.getNode();
    if (node.isDirectory()) {
      link.children.delete('..');
      this.getNode().nlink--;
    }
    this.children.delete(link.getName());
    this.length--;

    this.getNode().mtime = new Date();
    this.changes.emit({ type: 'child:delete', link, parent: this });
  }

  getChild(name: string): Link | undefined {
    this.getNode().atime = new Date();
    return this.children.get(name);
  }

  getPath(): string {
    return this.steps.join(PATH.SEP);
  }

  getParentPath(): string {
    return this.steps.slice(0, -1).join(PATH.SEP);
  }

  getName(): string {
    return this.steps[this.steps.length - 1];
  }

  toJSON() {
    return {
      steps: this.steps,
      ino: this.ino,
      children: Array.from(this.children.keys()),
    };
  }

  syncSteps() {
    this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name];
  }
}
