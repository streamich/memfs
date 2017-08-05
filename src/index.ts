import {constants as consts} from './constants';
import {Stats} from './node';
import {Volume} from './volume';



export const constants = consts;
export const F_OK = consts.F_OK;
export const R_OK = consts.R_OK;
export const W_OK = consts.W_OK;
export const X_OK = consts.X_OK;


// Default volume.
export const volume = new Volume;


// List of `fs.js` methods, used to export bound (`.bind`) method list, just like `require('fs')` would do.
const FS_METHODS = [
    'open',         'openSync',
    'readFile',     'readFileSync',
    'writeFile',    'writeFileSync',
    'symlink',      'symlinkSync',
    'realpath',     'realpathSync',
    'stat',         'statSync',
    'lstat',        'lstatSync',
    'fstat',        'fstatSync',
    'rename',       'renameSync',
    'exists',       'existsSync',
];

export interface IFs extends Volume<any> {
    Stats: new (...args) => Stats,
}

// Export bound fs methods.
export const fs: IFs = {} as any as IFs;
for(const method of FS_METHODS) {
    fs[method] = volume[method].bind(volume);
}

fs.Stats = Stats;

module.exports = {...module.exports, ...fs};
