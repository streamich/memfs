import { Node, FileNode, Link } from '../node';
import { constants } from '../constants';

describe('node.ts', () => {
  describe('FileNode', () => {
    const node = new FileNode(1);
    it('properly sets mode with permission respected', () => {
      const node = new FileNode(1, constants.S_IFREG | 0o755);
      expect(node.perm).toBe(0o755);
      expect(node.mode).toBe(constants.S_IFREG | 0o755);
      expect(node.isFile()).toBe(true); // Make sure we still know it's a file
    });
    it('Setting/getting buffer creates a copy', () => {
      const buf = Buffer.from([1, 2, 3]);
      node.setBuffer(buf);
      expect(buf === node.getBuffer()).toBe(false); // Objects not equal, so copy.
      expect(buf.toJSON()).toEqual(node.getBuffer().toJSON());
    });
    describe('.write(buf, off, len, pos)', () => {
      it('Simple write into empty node', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2, 3]));
        expect(node.getBuffer().equals(Buffer.from([1, 2, 3]))).toBe(true);
      });
      it('Append to the end', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2]));
        node.write(Buffer.from([3, 4]), 0, 2, 2);
        const result = Buffer.from([1, 2, 3, 4]);
        expect(node.getBuffer().equals(result)).toBe(true);
      });
      it('Overwrite part of the buffer', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2, 3]));
        node.write(Buffer.from([4, 5, 6]), 1, 2, 1);
        const result = Buffer.from([1, 5, 6]);
        expect(node.getBuffer().equals(result)).toBe(true);
      });
      it('Overwrite part of the buffer and extend', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2, 3]));
        node.write(Buffer.from([4, 5, 6, 7]), 0, 4, 2);
        const result = Buffer.from([1, 2, 4, 5, 6, 7]);
        expect(node.getBuffer().equals(result)).toBe(true);
      });
      it('Write outside the space of the buffer', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2, 3]));
        node.write(Buffer.from([7, 8, 9]), 0, 3, 6);
        node.write(Buffer.from([4, 5, 6]), 0, 3, 3);
        const result = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(node.getBuffer().equals(result)).toBe(true);
      });
    });
    describe('.read(buf, off, len, pos)', () => {
      it('Simple one byte read', () => {
        const node = new FileNode(1);
        node.write(Buffer.from([1, 2, 3]));
        const buf = Buffer.allocUnsafe(1);
        node.read(buf, 0, 1, 1);
        expect(buf.equals(Buffer.from([2]))).toBe(true);
      });
      it('updates the atime but not ctime', () => {
        const node = new FileNode(1);
        const oldAtime = node.atime;
        const oldCtime = node.ctime;
        node.read(Buffer.alloc(0));
        const newAtime = node.atime;
        const newCtime = node.ctime;
        expect(newAtime).not.toBe(oldAtime);
        expect(newCtime).toBe(oldCtime);
      });
    });
    describe('.chmod(perm)', () => {
      const node = new FileNode(1, constants.S_IFREG | 0o666);
      expect(node.perm).toBe(0o666);
      expect(node.isFile()).toBe(true);
      node.chmod(0o600);
      expect(node.perm).toBe(0o600);
      expect(node.isFile()).toBe(true);
    });
    describe.each(['uid', 'gid', 'mtime', 'perm', 'nlink'])('when %s changes', field => {
      it('updates the property and the ctime', () => {
        const node = new FileNode(1);
        const oldCtime = node.ctime;
        node[field] = 1;
        const newCtime = node.ctime;
        expect(newCtime).not.toBe(oldCtime);
        expect(node[field]).toBe(1);
      });
    });
    describe('when atime changes', () => {
      it('updates the property but NOT the ctime', () => {
        const node = new FileNode(1);
        const oldCtime = node.ctime;
        node.atime = new Date(1);
        const newCtime = node.ctime;
        expect(newCtime).toBe(oldCtime);
        expect(node.atime).toEqual(new Date(1));
      });
    });
    describe('.getString(encoding?)', () => {
      it('updates the atime but not ctime', () => {
        const node = new FileNode(1);
        const oldAtime = node.atime;
        const oldCtime = node.ctime;
        node.getString();
        const newAtime = node.atime;
        const newCtime = node.ctime;
        expect(newAtime).not.toBe(oldAtime);
        expect(newCtime).toBe(oldCtime);
      });
    });
    describe('.getBuffer()', () => {
      it('updates the atime but not ctime', () => {
        const node = new FileNode(1);
        const oldAtime = node.atime;
        const oldCtime = node.ctime;
        node.getBuffer();
        const newAtime = node.atime;
        const newCtime = node.ctime;
        expect(newAtime).not.toBe(oldAtime);
        expect(newCtime).toBe(oldCtime);
      });
    });
  });
});
