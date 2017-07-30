import {fs, readFileSync, writeFileSync} from '../src/index';




fs.writeFileSync('test.txt', 'Hello there...');
console.log(fs.readFileSync('test.txt').toString());
