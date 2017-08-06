import {expect} from 'chai';
import _process, {createProcess} from "./process";


describe('process', () => {
    describe('createProcess', () => {
        const proc = createProcess();
        it('Exports default object', () => {
            expect(typeof _process).to.equal('object');
        });
        it('.getuid() and .getgid()', () => {
            expect(proc.getuid()).to.be.a('number');
            expect(proc.getgid()).to.be.a('number');
        });
        it('.cwd()', () => {
            expect(proc.cwd()).to.be.a('string');
        });
        it('.nextTick()', done => {
            expect(proc.nextTick).to.be.a('function');
            proc.nextTick(done);
        });
    });
});