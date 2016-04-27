// https://github.com/streamich/memfs/issues/4


var memfs = require('../index');

// var path = require('path');
// console.log(path.dirname('/a/b/c'));
// process.exit();

// var fs = require('fs');
// fs.readdirSync('/a/c/d');


var mem = new memfs.Volume;
mem.mountSync('/a');
mem.mkdirSync('/a/b');
mem.mkdirSync('/a/b/c/');
mem.mkdirSync('/a/b/f/');
// mem.mkdirSync('/a/b/c/d.stuff');
mem.writeFileSync('/a/b/c/d.stuff', 'wat');
mem.writeFileSync('/a/b/c/d.stuff', 'wat2');

console.log(mem.readdirSync('/a'));
console.log(mem.readdirSync('/a/b'));
console.log(mem.readdirSync('/a/b/c/'));
console.log(mem.readFileSync('/a/b/c/d.stuff').toString());
// console.log(mem.readdirSync('/a/b/c/d'));

// console.log(mem.flattened);
// console.log(mem.fds);
