import {expect} from 'chai';
import setImmediate from './setImmediate';

describe('setImmediate', () => {
    it('Is a function', () => {
        expect(setImmediate).to.be.a('function');
    });
    it('Execute callback on next event loop cycle', done => {
        setImmediate(done);
    });
});