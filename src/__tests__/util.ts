import { createFsFromVolume, Volume } from '..';
import { Link, Node } from '../node';

export const create = (json: { [s: string]: string } = { '/foo': 'bar' }) => {
  const vol = Volume.fromJSON(json);
  return vol;
};

export const createFs = (json?) => {
  return createFsFromVolume(create(json));
};

export const tryGetChild = (link: Link, name: string): Link => {
  const child = link.getChild(name);

  if (!child) {
    throw new Error(`expected link to have a child named "${name}"`);
  }

  return child;
};

export const tryGetChildNode = (link: Link, name: string): Node => tryGetChild(link, name).getNode();
