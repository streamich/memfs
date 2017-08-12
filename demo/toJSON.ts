import {Volume} from '../src/index';


const vol = Volume.fromJSON({
    '/foo': 'bar',
    '/dir1/file.js': '// comment...',
    '/dir2/index.js': 'process',
    '/dir2/main.js': 'console.log(123)',
});
console.log(vol.toJSON());


console.log(vol.toJSON('/dir2'));


console.log(vol.toJSON('/dir1'));


console.log(vol.toJSON(['/dir2', '/dir1']));


console.log(vol.toJSON('/'));


let a = {a: 1};
console.log(vol.toJSON('/dir1', a));



console.log(vol.toJSON('/dir2', {}, true));