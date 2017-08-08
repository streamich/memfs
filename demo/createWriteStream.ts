import {vol} from '../src/index';


const ws = vol.createWriteStream('/readme', 'utf8');
ws.end('lol');
ws.on('finish', () => {
    console.log(vol.readFileSync('/readme').toString());
});
