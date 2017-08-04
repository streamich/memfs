import {Volume} from './volume';
import {constants as consts} from './constants';


export const constants = consts;
export const F_OK = consts.F_OK;
export const R_OK = consts.R_OK;
export const W_OK = consts.W_OK;
export const X_OK = consts.X_OK;


// Default volume.
export const volume = new Volume;


// List of `fs.js` methods, used to export bound (`.bind`) method list, just like `require('fs')` would do.
const FS_METHODS = [
    /*'readFile', */'readFileSync',
    /*'writeFile', */'writeFileSync',
];


// Export bound fs methods.
export const fs: Volume<any> = {} as any as Volume<any>;
for(const method of FS_METHODS) {
    fs[method] = volume[method].bind(volume);
}


module.exports = {...module.exports, ...fs};
