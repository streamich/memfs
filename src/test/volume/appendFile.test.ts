import {expect} from 'chai';
import {create} from "./util";


describe('appendFile(file, data[, options], callback)', () => {
    it('Simple write to non-existing file', done => {
        const vol = create();
        vol.appendFile('/test', 'hello', (err, res) => {
            expect(vol.readFileSync('/test', 'utf8')).to.equal('hello');
            done();
        });
    });
    it('Append to existing file', done => {
        const vol = create({'/a': 'b'});
        vol.appendFile('/a', 'c', (err, res) => {
            expect(vol.readFileSync('/a', 'utf8')).to.equal('bc');
            done();
        });
    });
});