import { Volume } from '../src/volume';

const vol = new Volume();
vol.fromDirectory('demo', '/app');

const out = vol.toJSON();

const v2 = Volume.fromJSON(out);
console.log(v2.readdirSync('/app'));
