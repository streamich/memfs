import { createFsFromVolume, Volume } from '..';
import { Link, Node } from '../node';

// Turn the done callback into an incremental one that will only fire after being called
// `times` times, failing with the first reported error if such exists.
// Useful for testing callback-style functions with several different fixtures without
// having to clutter the test suite with a multitude of individual tests (like it.each would).
export const multitest = (_done: (err?: Error) => void, times: number) => {
  let err;
  return function done(_err?: Error) {
    err ??= _err;
    if (!--times) _done(_err);
  };
};

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

const nodeMajorVersion = +process.version.split('.')[0].slice(1);

/**
 * The `File` global is available only starting in Node v20. Hence we run the
 * tests only in those versions.
 */
export const onlyOnNode20 = nodeMajorVersion >= 20 ? describe : describe.skip;
