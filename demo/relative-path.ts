import {Volume} from '../src/volume';


const vol = Volume.fromJSON({'./README': 'Hello'});

console.log(vol.toJSON());
console.log(vol.readdirSync('/home'));
