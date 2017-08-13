import {Volume} from '../src/index';


const vol = new Volume;
vol.mountSync('/test', {
    'foo': 'bar',
});


console.log(vol.toJSON());