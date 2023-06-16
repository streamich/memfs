import type * as opts from "./types/options";
import { MODE } from './constants';

const mkdirDefaults: opts.IMkdirOptions = {
  mode: MODE.DIR,
  recursive: false,
};

export const getMkdirOptions = (options): opts.IMkdirOptions => {
  if (typeof options === 'number') return Object.assign({}, mkdirDefaults, { mode: options });
  return Object.assign({}, mkdirDefaults, options);
};
