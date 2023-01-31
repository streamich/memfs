import { Volume } from '../src/volume';

const vol = new Volume();
vol.fromDirectory('demo');
const files = vol.readdirSync('/');
console.log(files);

const out = vol.toJSON();
console.log(out);
