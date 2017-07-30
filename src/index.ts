import {Volume} from './volume';


// Default volume.
export const fs = new Volume;
fs.mountSync(); // Create a default layer.


export const mountSync = fs.mountSync.bind(fs);
export const readFileSync = fs.readFileSync.bind(fs);

