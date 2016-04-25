var memfs = require('./index');


var mem = new memfs.Volume;
mem.mountSync('./', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');",
    "dir/more/hello.js": "console.log('hello world');",
    "asdf/asdf/hello.js": "console.log('hello world');",
});


console.log(mem.readFileSync('./test.js').toString());
mem.writeFileSync('./lol.txt', 'Hello there');
console.log(mem.readFileSync('./lol.txt').toString());
