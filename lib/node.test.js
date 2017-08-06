"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var node_1 = require("./node");
describe('node.ts', function () {
    describe('Node', function () {
        var node = new node_1.Node(1);
        it('Setting/getting buffer creates a copy', function () {
            var buf = Buffer.from([1, 2, 3]);
            node.setBuffer(buf);
            chai_1.expect(buf === node.getBuffer()).to.be.false;
            chai_1.expect(buf.toJSON()).to.eql(node.getBuffer().toJSON());
        });
        describe('.write(buf, off, len, pos)', function () {
            it('Simple write into empty node', function () {
                var node = new node_1.Node(1);
                node.write(Buffer.from([1, 2, 3]));
                chai_1.expect(node.getBuffer().equals(Buffer.from([1, 2, 3]))).to.be.true;
            });
            it('Append to the end', function () {
                var node = new node_1.Node(1);
                node.write(Buffer.from([1, 2]));
                node.write(Buffer.from([3, 4]), 0, 2, 2);
                var result = Buffer.from([1, 2, 3, 4]);
                chai_1.expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Overwrite part of the buffer', function () {
                var node = new node_1.Node(1);
                node.write(Buffer.from([1, 2, 3]));
                node.write(Buffer.from([4, 5, 6]), 1, 2, 1);
                var result = Buffer.from([1, 5, 6]);
                chai_1.expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Overwrite part of the buffer and extend', function () {
                var node = new node_1.Node(1);
                node.write(Buffer.from([1, 2, 3]));
                node.write(Buffer.from([4, 5, 6, 7]), 0, 4, 2);
                var result = Buffer.from([1, 2, 4, 5, 6, 7]);
                chai_1.expect(node.getBuffer().equals(result)).to.be.true;
            });
            it('Write outside the space of the buffer', function () {
                var node = new node_1.Node(1);
                node.write(Buffer.from([1, 2, 3]));
                node.write(Buffer.from([7, 8, 9]), 0, 3, 6);
                node.write(Buffer.from([4, 5, 6]), 0, 3, 3);
                var result = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                chai_1.expect(node.getBuffer().equals(result)).to.be.true;
            });
        });
    });
});
