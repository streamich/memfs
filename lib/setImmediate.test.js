"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var setImmediate_1 = require("./setImmediate");
describe('setImmediate', function () {
    it('Is a function', function () {
        chai_1.expect(setImmediate_1.default).to.be.a('function');
    });
    it('Execute callback on next event loop cycle', function (done) {
        setImmediate_1.default(done);
    });
});
