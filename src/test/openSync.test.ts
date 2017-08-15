import {fs} from '..';
import {expect} from 'chai';


describe('openSync(path, mode[, flags])', () => {
    it('should return a file descriptor', () => {
        const fd = fs.openSync('/foo', 'w');
        expect(typeof fd).to.equal('number');
    });
});