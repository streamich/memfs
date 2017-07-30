/*
import {expect} from 'chai';
import * as memfs from '../index';


describe("API", function() {
    var mem = new memfs.Volume;
    var data = 'Hello there\n';
    mem.mountSync('./', {
        'test.txt': data,
    });

    describe('readFileSync', function() {
        it('string', function() {
            var out = mem.readFileSync('./test.txt', 'utf8');
            expect(out).to.equal(data);
        });
        it('buffer', function() {
            var out = mem.readFileSync('./test.txt');
            expect(out).to.be.instanceOf(Buffer);
            expect(out.toString()).to.equal(data);
        });
        it('wrong location', function() {
            var threw = false;
            try {
                var out = mem.readFileSync('../non_existing.txt');
            }catch(e) {
                threw = true;
            }
            expect(threw).to.equal(true);
        });
        it('absolute path', function() {
            var out = mem.readFileSync(process.cwd() + '/test.txt', 'utf8');
            expect(out).to.equal(data);
        });
    });

    describe('writeFileSync', function() {
        it('create new', function() {
            var f = './written_sync.txt';
            var c = 'hello';
            mem.writeFileSync(f, c);
            expect(mem.readFileSync(f, 'utf8')).to.equal(c);
        });
    });

    // https://github.com/streamich/memfs/issues/4
    describe('readdirSync', function() {
        it('create directories above file', function() {
            var mem = new memfs.Volume;
            mem.mountSync('/a', {});
            mem.mkdirSync('/a/b/');
            mem.mkdirSync('/a/b/c/');
            mem.writeFileSync('/a/b/c/d.stuff', 'wat');
            var list = mem.readdirSync('/a');
            expect(list.length).to.equal(1);
            expect(list[0]).to.equal('b');
        });
    });
});
*/
