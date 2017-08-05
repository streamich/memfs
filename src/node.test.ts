import {expect} from 'chai';
import {Node} from "./node";


describe('node.ts', () => {
    describe('Node', () => {
        const node = new Node(1);
        it('Setting/getting buffer creates a copy', () => {
            const buf = Buffer.from([1,2,3]);
            node.setBuffer(buf);
            expect(buf === node.getBuffer()).to.be.false; // Objects not equal, so copy.
            expect(buf.toJSON()).to.eql(node.getBuffer().toJSON());
        });
    });
});