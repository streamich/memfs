import {expect} from 'chai';
import {create} from "./util";


describe('existsSync(path)', () => {
    const vol = create();
    it('Returns true if file exists', () => {
        const result = vol.existsSync('/foo');
        expect(result).to.be.true;
    });
    it('Returns false if file does not exist', () => {
        const result = vol.existsSync('/foo2');
        expect(result).to.be.false;
    });
    it('invalid path type should not throw', () => {
        expect(vol.existsSync(123 as any)).to.be.false;
    });
});