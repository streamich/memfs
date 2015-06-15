/// <reference path="typings/tsd.d.ts" />
var unionfs = require('../unionfs/index');
var memfs = require('./index');
var fs = require('fs');
var mem = new memfs.Volume;
mem.mountSync('./', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');"
});
unionfs.use(fs).use(mem).replace(fs);
//console.log(mem.readFileSync('./test.js').toString());
//console.log(fs.readFileSync('./test.js').toString());
require('./test.js');
