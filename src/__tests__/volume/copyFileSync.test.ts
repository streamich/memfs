import {create} from "../util";

describe('copyFileSync(src, dest[, flags])', () => {
    it('method exists', () => {
        const vol = create();
        expect(typeof vol.copyFileSync).toBe('function');
    });
});
