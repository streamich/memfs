import {Volume} from '../..';
import {expect} from 'chai';


const create = (json = {'/foo': 'bar'}) => {
    const vol = Volume.fromJSON(json);
    return vol;
};


describe('write(fs, str, position, encoding, callback)', () => {
    it('Simple write to file', done => {
        const vol = create();
        const fd = vol.openSync('/test', 'w');
        vol.write(fd, 'lol', 0, 'utf8', (err, bytes, str) => {
            expect(err).to.equal(null);
            expect(bytes).to.equal(3);
            expect(str).to.equal('lol');
            expect(vol.readFileSync('/test', 'utf8')).to.equal('lol');
            done();
        });
    });
});