"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decoder = exports.encoder = void 0;
const CborEncoder_1 = require("json-joy/es6/json-pack/cbor/CborEncoder");
const CborDecoder_1 = require("json-joy/es6/json-pack/cbor/CborDecoder");
exports.encoder = new CborEncoder_1.CborEncoder();
exports.decoder = new CborDecoder_1.CborDecoder();
//# sourceMappingURL=json.js.map