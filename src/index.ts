import {Volume} from './volume';
import {constants as consts} from './constants';


export const constants = consts;
export const F_OK = consts.F_OK;
export const R_OK = consts.R_OK;
export const W_OK = consts.W_OK;
export const X_OK = consts.X_OK;


// Default volume.
export const fs = new Volume;
fs.mountSync(); // Create a default layer.


export const mountSync = fs.mountSync.bind(fs);
export const readFileSync = fs.readFileSync.bind(fs);
export const writeFileSync = fs.writeFileSync.bind(fs);
