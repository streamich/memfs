import { Volume } from '..';
import { Link, Node, NestedDirectoryJSON } from '@jsonjoy.com/fs-core';
import type { SuperblockFromJsonOptions } from '@jsonjoy.com/fs-core/lib/Superblock';

export const multitest = (_done: (err?: Error) => void, times: number) => {
  let err;
  return function done(_err?: Error) {
    err ??= _err;
    if (!--times) _done(_err);
  };
};

export const create = (json: { [s: string]: string } = { '/foo': 'bar' }, options?: SuperblockFromJsonOptions) => {
  options ??= {};
  options.cwd ??= '/';
  const vol = Volume.fromJSON(json, options);
  return vol;
};

export const createFs = (json?, options?: SuperblockFromJsonOptions) => {
  const vol = create(json, options);
  return vol;
};

export const memfs = (json: NestedDirectoryJSON = {}, options?: SuperblockFromJsonOptions) => {
  const vol = Volume.fromNestedJSON(json, options);
  return { fs: vol, vol };
};

export const tryGetChild = (link: Link, name: string): Link => {
  const child = link.getChild(name);
  if (!child) {
    throw new Error(`expected link to have a child named "${name}"`);
  }
  return child;
};

export const tryGetChildNode = (link: Link, name: string): Node => tryGetChild(link, name).getNode();

const nodeMajorVersion = +process.version.split('.')[0].slice(1);

export const onlyOnNode20 = nodeMajorVersion >= 20 ? describe : describe.skip;
