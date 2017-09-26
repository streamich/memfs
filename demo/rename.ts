import {Volume} from "../src/volume";

const vol = Volume.fromJSON({'/foo/foo': 'bar'});
vol.renameSync('/foo/foo', '/foo/foo2');
console.log(vol.toJSON());
