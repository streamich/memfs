import * as fs from 'fs';
import * as path from 'path';
import {Volume} from '../src/volume';


// const filename = path.join(__dirname, '../test/mock/text.txt');
// fs.watch(filename, (event, filename) => {
//     console.log(event, filename);
// });

const vol = Volume.fromJSON({'/hello.txt': 'World'});
vol.watch('/hello.txt', {}, (event, filename) => {
    console.log(event, filename);
    console.log(vol.readFileSync('/hello.txt', 'utf8'));
});

vol.appendFileSync('/hello.txt', '!');

setTimeout(() => {
    vol.appendFileSync('/hello.txt', ' OK?');
}, 1000);

