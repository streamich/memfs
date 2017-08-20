import {Volume} from '../..';
import {expect} from 'chai';
import {create} from "./util";


describe('appendFileSync(file, data, options)', () => {
    it('Simple write to non-existing file', () => {
        const vol = create();
        vol.appendFileSync('/test', 'hello');
        expect(vol.readFileSync('/test', 'utf8')).to.equal('hello');
    });
    it('Append to existing file', () => {
        const vol = create({'/a': 'b'});
        vol.appendFileSync('/a', 'c');
        expect(vol.readFileSync('/a', 'utf8')).to.equal('bc');
    });
});