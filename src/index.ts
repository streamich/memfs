import {constants as consts} from './constants';
import {Stats} from './node';
import {Volume as _Volume} from './volume';


export const Volume = _Volume;


export const constants = consts;
export const F_OK = consts.F_OK;
export const R_OK = consts.R_OK;
export const W_OK = consts.W_OK;
export const X_OK = consts.X_OK;


// Default volume.
export const vol = new _Volume;


// List of `fs.js` methods, used to export bound (`.bind`) method list, just like `require('fs')` would do.
const FS_METHODS = [
    'open',         'openSync',
    'close',        'closeSync',
    'readFile',     'readFileSync',
    'write',        'writeSync',
    'writeFile',    'writeFileSync',
    'link',         'linkSync',
    'unlink',       'unlinkSync',
    'symlink',      'symlinkSync',
    'realpath',     'realpathSync',
    'stat',         'statSync',
    'lstat',        'lstatSync',
    'fstat',        'fstatSync',
    'rename',       'renameSync',
    'exists',       'existsSync',
    'access',       'accessSync',
    'readdir',      'readdirSync',
    'watchFile',    'unwatchFile',
    'createReadStream',
];

export interface IFs extends _Volume {
    Stats: new (...args) => Stats,
}

export function createFsFromVolume(volume: _Volume): IFs {
    const fs = {} as any as IFs;

    // Bind FS methods.
    for(const method of FS_METHODS) {
        fs[method] = volume[method].bind(volume);
    }

    fs.Stats = Stats;
    return fs;
}

export const fs: IFs = createFsFromVolume(vol);
module.exports = {...module.exports, ...fs};
