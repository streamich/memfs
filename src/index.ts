import {Stats} from './node';
import {Volume as _Volume, StatWatcher, FSWatcher, toUnixTimestamp} from './volume';
import * as volume from './volume';
const {fsSyncMethods, fsAsyncMethods} = require('fs-money/lib/util/lists');
import {constants} from './constants';
const {F_OK, R_OK, W_OK, X_OK} = constants;


export const Volume = _Volume;


// Default volume.
export const vol = new _Volume;


export interface IFs extends _Volume {
    constants: typeof constants,
    Stats: new (...args) => Stats,
    StatWatcher,
    FSWatcher,
    ReadStream,
    WriteStream,
    _toUnixTimestamp,
}

export function createFsFromVolume(vol: _Volume): IFs {
    const fs = {F_OK, R_OK, W_OK, X_OK, constants, Stats} as any as IFs;

    // Bind FS methods.
    for(const method of fsSyncMethods) fs[method] = vol[method].bind(vol);
    for(const method of fsAsyncMethods) fs[method] = vol[method].bind(vol);

    fs.StatWatcher = StatWatcher.bind(null, vol);
    fs.FSWatcher = FSWatcher.bind(null, vol);
    fs.WriteStream = (volume as any).WriteStream.bind(null, vol);
    fs.ReadStream = (volume as any).ReadStream.bind(null, vol);

    fs._toUnixTimestamp = toUnixTimestamp;

    return fs;
}

export const fs: IFs = createFsFromVolume(vol);
declare let module;
module.exports = {...module.exports, ...fs};
