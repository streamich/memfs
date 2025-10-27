import { Node } from '../Node';
import { bufferFrom } from '../../vendor/node/internal/buffer';

describe('Node', () => {
  describe('buffer management with capacity tracking', () => {
    it('should handle sequential small writes efficiently', () => {
      const node = new Node(1, 0o666);
      const smallBuf = bufferFrom('x');

      // Write 100 small chunks
      for (let i = 0; i < 100; i++) {
        node.write(smallBuf, 0, 1, i);
      }

      expect(node.getSize()).toBe(100);
      const result = node.getBuffer();
      expect(result.length).toBe(100);
      expect(result.toString()).toBe('x'.repeat(100));
    });

    it('should handle writes at various positions', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello'), 0, 5, 0);
      expect(node.getSize()).toBe(5);
      expect(node.getBuffer().toString()).toBe('hello');

      // Writing at position 5 (immediately after) should work
      node.write(bufferFrom('world'), 0, 5, 5);
      expect(node.getSize()).toBe(10);
      expect(node.getBuffer().toString()).toBe('helloworld');
    });

    it('should handle overwriting existing data', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello world'), 0, 11, 0);
      expect(node.getSize()).toBe(11);

      node.write(bufferFrom('HELLO'), 0, 5, 0);
      expect(node.getSize()).toBe(11);
      expect(node.getBuffer().toString()).toBe('HELLO world');
    });

    it('should handle truncate to smaller size', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello world'), 0, 11, 0);
      expect(node.getSize()).toBe(11);

      node.truncate(5);
      expect(node.getSize()).toBe(5);
      expect(node.getBuffer().toString()).toBe('hello');
    });

    it('should handle truncate to larger size with zero-fill', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello'), 0, 5, 0);
      expect(node.getSize()).toBe(5);

      node.truncate(10);
      expect(node.getSize()).toBe(10);
      const result = node.getBuffer();
      expect(result.toString('utf8', 0, 5)).toBe('hello');
      expect(result[5]).toBe(0);
      expect(result[9]).toBe(0);
    });

    it('should handle truncate to zero', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello'), 0, 5, 0);
      expect(node.getSize()).toBe(5);

      node.truncate(0);
      expect(node.getSize()).toBe(0);
      expect(node.getBuffer().length).toBe(0);
    });

    it('should handle read from various positions', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello world'), 0, 11, 0);

      const buf1 = Buffer.alloc(5);
      const read1 = node.read(buf1, 0, 5, 0);
      expect(read1).toBe(5);
      expect(buf1.toString()).toBe('hello');

      const buf2 = Buffer.alloc(5);
      const read2 = node.read(buf2, 0, 5, 6);
      expect(read2).toBe(5);
      expect(buf2.toString()).toBe('world');
    });

    it('should handle read past end of file', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello'), 0, 5, 0);

      const buf = Buffer.alloc(10);
      const read = node.read(buf, 0, 10, 0);
      expect(read).toBe(5);
      expect(buf.toString('utf8', 0, 5)).toBe('hello');
    });

    it('should handle setBuffer and getBuffer', () => {
      const node = new Node(1, 0o666);

      const testBuf = bufferFrom('test data');
      node.setBuffer(testBuf);

      expect(node.getSize()).toBe(9);
      expect(node.getBuffer().toString()).toBe('test data');
    });

    it('should handle setString and getString', () => {
      const node = new Node(1, 0o666);

      node.setString('test string');

      expect(node.getSize()).toBe(11);
      expect(node.getString()).toBe('test string');
    });

    it('should return zero size for empty node', () => {
      const node = new Node(1, 0o666);
      expect(node.getSize()).toBe(0);
    });

    it('should handle multiple appends efficiently', () => {
      const node = new Node(1, 0o666);
      const chunk = bufferFrom('chunk');

      // Append 20 times
      for (let i = 0; i < 20; i++) {
        node.write(chunk, 0, 5, i * 5);
      }

      expect(node.getSize()).toBe(100);
      expect(node.getBuffer().toString()).toBe('chunk'.repeat(20));
    });

    it('should handle write at position beyond current size with zero-fill', () => {
      const node = new Node(1, 0o666);

      node.write(bufferFrom('hello'), 0, 5, 10);
      expect(node.getSize()).toBe(15);

      const result = node.getBuffer();
      // First 10 bytes should be zero-filled
      for (let i = 0; i < 10; i++) {
        expect(result[i]).toBe(0);
      }
      expect(result.toString('utf8', 10, 15)).toBe('hello');
    });
  });
});
