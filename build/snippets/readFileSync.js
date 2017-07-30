"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../src/index");
index_1.mountSync('/', {
    'test.txt': 'Hello world...',
});
