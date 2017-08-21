"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var volume_1 = require("./volume");
var chai_1 = require("chai");
var constants_1 = require("./constants");
var memfs = require('./index');
var lists_1 = require("fs-monkey/lib/util/lists");
describe('memfs', function () {
    it('Exports Volume constructor', function () {
        chai_1.expect(typeof memfs.Volume).to.equal('function');
        chai_1.expect(memfs.Volume).to.equal(volume_1.Volume);
    });
    it('Exports constants', function () {
        chai_1.expect(memfs.F_OK).to.equal(constants_1.constants.F_OK);
        chai_1.expect(memfs.R_OK).to.equal(constants_1.constants.R_OK);
        chai_1.expect(memfs.W_OK).to.equal(constants_1.constants.W_OK);
        chai_1.expect(memfs.X_OK).to.equal(constants_1.constants.X_OK);
        chai_1.expect(memfs.constants).to.eql(constants_1.constants);
    });
    it('Exports constructors', function () {
        chai_1.expect(typeof memfs.Stats).to.equal('function');
        chai_1.expect(typeof memfs.ReadStream).to.equal('function');
        chai_1.expect(typeof memfs.WriteStream).to.equal('function');
        chai_1.expect(typeof memfs.FSWatcher).to.equal('function');
        chai_1.expect(typeof memfs.StatWatcher).to.equal('function');
    });
    it('Exports _toUnixTimestamp', function () {
        chai_1.expect(typeof memfs._toUnixTimestamp).to.equal('function');
    });
    it('Exports all Node\'s filesystem API methods', function () {
        for (var _i = 0, fsSyncMethods_1 = lists_1.fsSyncMethods; _i < fsSyncMethods_1.length; _i++) {
            var method = fsSyncMethods_1[_i];
            chai_1.expect(typeof memfs[method]).to.equal('function');
        }
        for (var _a = 0, fsAsyncMethods_1 = lists_1.fsAsyncMethods; _a < fsAsyncMethods_1.length; _a++) {
            var method = fsAsyncMethods_1[_a];
            chai_1.expect(typeof memfs[method]).to.equal('function');
        }
    });
});
