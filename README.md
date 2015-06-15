# memfs

A `fs` API to workd with *virtual in-memory* files.

```javascript
var memfs = require('memfs');

var mem = new memfs.Volume;
mem.mountSync('./', {
    "test.js": "console.log(123);",
    "dir/hello.js": "console.log('hello world');"
});

console.log(mem.readFileSync('./dir/hello.js').toString());
```

Use it together with `unionfs`:

```javascript
var unionfs = require('unionfs');
var fs = require('fs');

// Create a union of two file systems:
unionfs
    .use(fs)
    .use(mem);
    
// Now `unionfs` has the `fs` API but on both file systems.
console.log(unionfs.readFileSync('./test.js').toString()); // console.log(123);
    
// Replace `fs` with the union of thos file systems.
unionfs.replace(fs);

// Now you can do this.
console.log(fs.readFileSync('./test.js').toString()); // console.log(123);

// ... and this:
require('./test.js'); // 123

```
