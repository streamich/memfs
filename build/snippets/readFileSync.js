"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../src/index");
index_1.fs.writeFileSync('/test.txt', 'hello...');
console.log(index_1.fs.readFileSync('/test.txt', 'utf8'));
