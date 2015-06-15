/// <reference path="typings/tsd.d.ts" />
//var unionfs = require('../unionfs/unionfs');
var memfs = require('./index');
var fs = require('fs');


var mem = new memfs.Volume;
mem.mountSync('./', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');"
});
//console.log(mem);
//console.log(mem.getNode('./test.js'));
//console.log(mem.getNode('./test.js').getData());

//console.log(mem.readFileSync('./test.js').toString());
//mem.readFile('./test.js', function(err, buf) {
//    console.log(err);
//    console.log(buf.toString());
//});

//console.log(mem.realpathSync('./test2.js'));
//mem.realpath('./test.js', function(err, path) {
//    console.log(err, path);
//});

//console.log(mem.statSync('./test.js').isFile());
//console.log(mem.statSync('./test.js').isDirectory());

//mem.lstat('./test.js', function(err, stat) {
//    console.log(stat);
//});

//mem.renameSync('./test.js', './test2.js');
//mem.rename('./test.js', './test2.js', (err) => {
//    console.log(mem);
//});

//console.log(mem.fstatSync(-2));

//console.log(mem.readdirSync('./'));
//mem.readdir('./', function(err, res) {
//    console.log(err, res);
//});
//console.log(mem.existsSync('./test.js'));
//mem.writeFileSync('./test.js', 'lalal');
//console.log(mem.readFileSync('./test.js').toString());

//console.log(mem);

console.log(mem.openSync('./test.js'));
console.log(mem.writeSync(-1, 'test', 2));
console.log(mem.writeSync(-1, '!'));
console.log(mem.readFileSync('./test.js').toString());
console.log(mem.getFile('./test.js'));
//console.log(mem.mkdirSync('./haha'));
//console.log(mem.readdirSync('./'));
//mem.chownSync('./test.js', 5, 6);
//console.log(mem.statSync('./test.js'));
//mem.appendFile('./test23.js', '  // ...', function() {
//    console.log(mem.readFileSync('./test23.js').toString());
//    console.log(mem.readdirSync('./'));
//});


//unionfs
//    .use(fs)
//    .replace(fs);
//
//
//console.log(fs.statSync('./example.js'));


