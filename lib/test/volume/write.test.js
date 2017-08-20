"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("../..");
var chai_1 = require("chai");
var create = function (json) {
    if (json === void 0) { json = { '/foo': 'bar' }; }
    var vol = __1.Volume.fromJSON(json);
    return vol;
};
describe('write(fs, str, position, encoding, callback)', function () {
    it('Simple write to file', function (done) {
        var vol = create();
        var fd = vol.openSync('/test', 'w');
        vol.write(fd, 'lol', 0, 'utf8', function (err, bytes, str) {
            chai_1.expect(err).to.equal(null);
            chai_1.expect(bytes).to.equal(3);
            chai_1.expect(str).to.equal('lol');
            chai_1.expect(vol.readFileSync('/test', 'utf8')).to.equal('lol');
            done();
        });
    });
});
