import type * as opts from './types/options';
import { FLAGS, MODE } from './constants';
import { assertEncoding } from '../encoding';
import * as misc from './types/misc';
import { validateCallback } from './util';
import { IAppendFileOptions } from '../volume';

const mkdirDefaults: opts.IMkdirOptions = {
  mode: MODE.DIR,
  recursive: false,
};

export const getMkdirOptions = (options): opts.IMkdirOptions => {
  if (typeof options === 'number') return Object.assign({}, mkdirDefaults, { mode: options });
  return Object.assign({}, mkdirDefaults, options);
};

const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;

export function getOptions<T extends opts.IOptions>(defaults: T, options?: T | string): T {
  let opts: T;
  if (!options) return defaults;
  else {
    const tipeof = typeof options;
    switch (tipeof) {
      case 'string':
        opts = Object.assign({}, defaults, { encoding: options as string });
        break;
      case 'object':
        opts = Object.assign({}, defaults, options);
        break;
      default:
        throw TypeError(ERRSTR_OPTS(tipeof));
    }
  }

  if (opts.encoding !== 'buffer') assertEncoding(opts.encoding);

  return opts;
}

export function optsGenerator<TOpts>(defaults: TOpts): (opts) => TOpts {
  return options => getOptions(defaults, options);
}

export function optsAndCbGenerator<TOpts, TResult>(getOpts): (options, callback?) => [TOpts, misc.TCallback<TResult>] {
  return (options, callback?) =>
    typeof options === 'function' ? [getOpts(), options] : [getOpts(options), validateCallback(callback)];
}

export const optsDefaults: opts.IOptions = {
  encoding: 'utf8',
};

export const getDefaultOpts = optsGenerator<opts.IOptions>(optsDefaults);
export const getDefaultOptsAndCb = optsAndCbGenerator<opts.IOptions, any>(getDefaultOpts);

const rmdirDefaults: opts.IRmdirOptions = {
  recursive: false,
};

export const getRmdirOptions = (options): opts.IRmdirOptions => {
  return Object.assign({}, rmdirDefaults, options);
};

const getRmOpts = optsGenerator<opts.IOptions>(optsDefaults);
export const getRmOptsAndCb = optsAndCbGenerator<opts.IRmOptions, any>(getRmOpts);

const readFileOptsDefaults: opts.IReadFileOptions = {
  flag: 'r',
};
export const getReadFileOptions = optsGenerator<opts.IReadFileOptions>(readFileOptsDefaults);

const readdirDefaults: opts.IReaddirOptions = {
  encoding: 'utf8',
  withFileTypes: false,
};
export const getReaddirOptions = optsGenerator<opts.IReaddirOptions>(readdirDefaults);
export const getReaddirOptsAndCb = optsAndCbGenerator<opts.IReaddirOptions, misc.TDataOut[] | misc.IDirent[]>(
  getReaddirOptions,
);

const appendFileDefaults: opts.IAppendFileOptions = {
  encoding: 'utf8',
  mode: MODE.DEFAULT,
  flag: FLAGS[FLAGS.a],
};
export const getAppendFileOpts = optsGenerator<IAppendFileOptions>(appendFileDefaults);
export const getAppendFileOptsAndCb = optsAndCbGenerator<IAppendFileOptions, void>(getAppendFileOpts);

const statDefaults: opts.IStatOptions = {
  bigint: false,
};
export const getStatOptions: (options?: any) => opts.IStatOptions = (options = {}) =>
  Object.assign({}, statDefaults, options);
export const getStatOptsAndCb: (
  options: any,
  callback?: misc.TCallback<misc.IStats>,
) => [opts.IStatOptions, misc.TCallback<misc.IStats>] = (options, callback?) =>
  typeof options === 'function' ? [getStatOptions(), options] : [getStatOptions(options), validateCallback(callback)];

const realpathDefaults: opts.IReadFileOptions = optsDefaults;
export const getRealpathOptions = optsGenerator<opts.IRealpathOptions>(realpathDefaults);
export const getRealpathOptsAndCb = optsAndCbGenerator<opts.IRealpathOptions, misc.TDataOut>(getRealpathOptions);

export const writeFileDefaults: opts.IWriteFileOptions = {
  encoding: 'utf8',
  mode: MODE.DEFAULT,
  flag: FLAGS[FLAGS.w],
};
export const getWriteFileOptions = optsGenerator<opts.IWriteFileOptions>(writeFileDefaults);
