"use strict";
var chai_1 = require('chai');
var memfs = require('../index');
describe("API", function () {
    var mem = new memfs.Volume;
    var data = 'Hello there\n';
    mem.mountSync('./', {
        'test.txt': data
    });
    describe('readFileSync', function () {
        it('string', function () {
            var out = mem.readFileSync('./test.txt', 'utf8');
            chai_1.expect(out).to.equal(data);
        });
        it('buffer', function () {
            var out = mem.readFileSync('./test.txt');
            chai_1.expect(out).to.be.instanceOf(Buffer);
            chai_1.expect(out.toString()).to.equal(data);
        });
        it('wrong location', function () {
            var threw = false;
            try {
                var out = mem.readFileSync('../non_existing.txt');
            }
            catch (e) {
                threw = true;
            }
            chai_1.expect(threw).to.equal(true);
        });
        it('absolute path', function () {
            var out = mem.readFileSync(process.cwd() + '/test.txt', 'utf8');
            chai_1.expect(out).to.equal(data);
        });
    });
    describe('writeFileSync', function () {
        it('create new', function () {
            var f = './written_sync.txt';
            var c = 'hello';
            mem.writeFileSync(f, c);
            chai_1.expect(mem.readFileSync(f, 'utf8')).to.equal(c);
        });
    });
});
