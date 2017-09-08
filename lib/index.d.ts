import { Stats } from './node';
import { Volume as _Volume, StatWatcher, FSWatcher, IReadStream, IWriteStream } from './volume';
import { constants } from './constants';
export declare const Volume: typeof _Volume;
export declare const vol: _Volume;
export interface IFs extends _Volume {
    constants: typeof constants;
    Stats: new (...args) => Stats;
    StatWatcher: new () => StatWatcher;
    FSWatcher: new () => FSWatcher;
    ReadStream: new (...args) => IReadStream;
    WriteStream: new (...args) => IWriteStream;
    _toUnixTimestamp: any;
}
export declare function createFsFromVolume(vol: _Volume): IFs;
export declare const fs: IFs;
