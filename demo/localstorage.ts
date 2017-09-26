import {createVolume} from '../src/volume-localstorage';

const obj = {};
const Volume = createVolume('default', obj);

const vol = new Volume;
vol.fromJSON({'/foo': 'bar', '/foo2': 'bar2'});
// vol.unlinkSync('/foo');

console.log(obj);
console.log(vol.toJSON());



