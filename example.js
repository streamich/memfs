/// <reference path="typings/tsd.d.ts" />
var unionfs = require('../unionfs/index');
var memfs = require('./index');
var fs = require('fs');
var mem = new memfs.Volume;
mem.mountSync('/test/dir/dir2', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');",
    "dir/more/hello.js": "console.log('hello world');",
    "asdf/asdf/hello.js": "console.log('hello world');"
});
unionfs
    .use(fs)
    .use(mem)
    .replace(fs);
//console.log(mem.readFileSync('/test/dir/dir2\\test.js').toString());
console.log(mem.existsSync('/test/dir/dir2\\test.js').toString());
console.log(mem.existsSync('/test2/dir/dir2\\test.js').toString());
//console.log(mem.readdirSync('/test/dir/dir2'));
