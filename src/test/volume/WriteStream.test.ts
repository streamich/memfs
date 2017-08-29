import {expect} from 'chai';
import {createFs} from "./util";


describe('WriteStream', () => {
    it('fs has WriteStream constructor', () => {
        const fs = createFs();
        expect(typeof fs.WriteStream).to.equal('function');
    });
    it('WriteStream has constructor property', () => {
        const fs = createFs();
        expect(typeof fs.WriteStream.constructor).to.equal('function');
    });
    it('Can write basic file', done => {
        const fs = createFs({'/a': 'b'});
        const ws = new fs.WriteStream('/a', 'utf8');
        ws.end('d');
        ws.on('finish', () => {
            expect(fs.readFileSync('/a', 'utf8')).to.equal('d');
            done();
        });
    });
});