"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var util_1 = require("./util");
describe('exists(path, callback)', function () {
    var vol = util_1.create();
    it('Returns true if file exists', function (done) {
        vol.exists('/foo', function (exists) {
            chai_1.expect(exists).to.be.true;
            done();
        });
    });
    it('Returns false if file does not exist', function (done) {
        vol.exists('/foo2', function (exists) {
            chai_1.expect(exists).to.be.false;
            done();
        });
    });
    it('Throws correct error if callback not provided', function (done) {
        try {
            vol.exists('/foo', undefined);
            throw new Error('not_this');
        }
        catch (err) {
            chai_1.expect(err.message).to.equal('callback must be a function');
            done();
        }
    });
    it('invalid path type should throw', function () {
        try {
            vol.exists(123, function () { });
            throw new Error('not_this');
        }
        catch (err) {
            chai_1.expect(err.message !== 'not_this').to.be.true;
        }
    });
});
