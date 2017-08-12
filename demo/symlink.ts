import {vol} from '../src';

vol.fromJSON({'/a1/a2/a3/a4/a5/hello.txt': 'world!'});
console.log(vol.readFileSync('/a1/a2/a3/a4/a5/hello.txt', 'utf8'));


vol.symlinkSync('/a1/a2/a3/a4/a5/hello.txt', '/link');
console.log(vol.readFileSync('/link', 'utf8'));


vol.symlinkSync('/a1', '/b1');
console.log(vol.readFileSync('/b1/a2/a3/a4/a5/hello.txt', 'utf8'));


vol.symlinkSync('/a1/a2', '/b2');
console.log(vol.readFileSync('/b2/a3/a4/a5/hello.txt', 'utf8'));


vol.symlinkSync('/b2', '/c2');
console.log(vol.readFileSync('/c2/a3/a4/a5/hello.txt', 'utf8'));


vol.mkdirpSync('/d1/d2');
vol.symlinkSync('/c2', '/d1/d2/to-c2');
console.log(vol.readFileSync('/d1/d2/to-c2/a3/a4/a5/hello.txt', 'utf8'));
