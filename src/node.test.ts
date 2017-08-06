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
        describe('.write(buf, off, len, pos)', () => {
            it('Simple write into empty node', () => {
                const node = new Node(1);
                node.write(Buffer.from([1,2,3]));
                expect(node.getBuffer().equals(Buffer.from([1,2,3]))).to.be.true;
            });
            it('Append to the end', () => {
                const node = new Node(1);
                node.write(Buffer.from([1,2]));
                node.write(Buffer.from([3,4]), 0, 2, 2);
                const result = Buffer.from([1,2,3,4]);
                expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Overwrite part of the buffer', () => {
                const node = new Node(1);
                node.write(Buffer.from([1,2,3]));
                node.write(Buffer.from([4,5,6]), 1, 2, 1);
                const result = Buffer.from([1,5,6]);
                expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Overwrite part of the buffer and extend', () => {
                const node = new Node(1);
                node.write(Buffer.from([1,2,3]));
                node.write(Buffer.from([4,5,6,7]), 0, 4, 2);
                const result = Buffer.from([1,2,4,5,6,7]);
                expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Write outside the space of the buffer', () => {
                const node = new Node(1);
                node.write(Buffer.from([1,2,3]));
                node.write(Buffer.from([7,8,9]), 0, 3, 6);
                node.write(Buffer.from([4,5,6]), 0, 3, 3);
                const result = Buffer.from([1,2,3,4,5,6,7,8,9]);
                expect(node.getBuffer().equals(result)).to.be.true;
            });
        });
    });
});