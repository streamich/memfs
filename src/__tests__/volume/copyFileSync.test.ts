import {create} from "../util";

describe('copyFileSync(src, dest[, flags])', () => {
    it('method exists', () => {
        const vol = create();

        expect(typeof vol.copyFileSync).toBe('function');
    });

    it('throws on incorrect path arguments', () => {
        const vol = create();

        expect(() => {
            (vol as any).copyFileSync();
        }).toThrow();

        expect(() => {
            (vol as any).copyFileSync(1);
        }).toThrow();

        expect(() => {
            (vol as any).copyFileSync(1, 2);
        }).toThrow();

        expect(() => {
            (vol as any).copyFileSync({}, {});
        }).toThrow();
    });

    it('copies file', () => {
        const vol = create({
            '/foo': 'hello world',
        });

        vol.copyFileSync('/foo', '/bar');

        expect(vol.readFileSync('/bar', 'utf8')).toBe('hello world');
    });
});
