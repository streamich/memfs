import {Volume} from '../src/volume';


const vol = new Volume;

// console.log(vol.root.walk([]));
vol.writeFileSync('/test.txt', 'hello...');

console.log(vol.readFileSync('/test.txt', {encoding: 'utf8'}));
// console.log(vol.root.children);
