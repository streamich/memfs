import {expect} from 'chai';
import {createFs} from "./util";


describe('ReadStream', () => {
    it('fs has ReadStream constructor', () => {
        const fs = createFs();
        expect(typeof fs.ReadStream).to.equal('function');
    });
    it('ReadStream has constructor property', () => {
        const fs = createFs();
        expect(typeof fs.ReadStream.constructor).to.equal('function');
    });
    it('Can read basic file', done => {
        const fs = createFs({'/a': 'b'});
        const rs = new fs.ReadStream('/a', 'utf8');
        rs.on('data', (data) => {
            expect(String(data)).to.equal('b');
            done();
        });
    });
});