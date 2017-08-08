import {vol} from '../src/index';

vol.writeFileSync('/readme', '# Hello World');
const rs = vol.createReadStream('/readme', 'utf8');
rs.on('data', (data) => {
    console.log('data', data.toString());
});
