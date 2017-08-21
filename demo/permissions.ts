import {Volume} from '../src/index';


const vol = Volume.fromJSON({'/foo': 'bar'});

console.log(vol.readFileSync('/foo', 'utf8'));

vol.chmodSync('/foo', 0);

console.log(vol.readFileSync('/foo', 'utf8'));
