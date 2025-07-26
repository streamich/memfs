import { fromStream } from '@jsonjoy.com/util/lib/streams/fromStream';
import { createFs } from '../util';

describe('FileHandle', () => {
  describe('position tracking', () => {
    it('should read from current position when position is null', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'Hello World!');
      const handle = await fs.promises.open('/test', 'r');

      const buffer1 = Buffer.alloc(5);
      const buffer2 = Buffer.alloc(5);

      // First read with position=null should read from start
      const result1 = await handle.read(buffer1, 0, 5, null);
      expect(result1.bytesRead).toBe(5);
      expect(buffer1.toString('utf8', 0, result1.bytesRead)).toBe('Hello');

      // Second read with position=null should continue from where we left off
      const result2 = await handle.read(buffer2, 0, 5, null);
      expect(result2.bytesRead).toBe(5);
      expect(buffer2.toString('utf8', 0, result2.bytesRead)).toBe(' Worl');

      await handle.close();
    });

    it('should read from current position when position is undefined', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'Hello World!');
      const handle = await fs.promises.open('/test', 'r');

      const buffer1 = Buffer.alloc(5);
      const buffer2 = Buffer.alloc(5);

      // First read with position=undefined should read from start
      const result1 = await handle.read(buffer1, 0, 5, undefined);
      expect(result1.bytesRead).toBe(5);
      expect(buffer1.toString('utf8', 0, result1.bytesRead)).toBe('Hello');

      // Second read with position=undefined should continue from where we left off
      const result2 = await handle.read(buffer2, 0, 5, undefined);
      expect(result2.bytesRead).toBe(5);
      expect(buffer2.toString('utf8', 0, result2.bytesRead)).toBe(' Worl');

      await handle.close();
    });

    it('should not update current position when reading from specific position', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'Hello World!');
      const handle = await fs.promises.open('/test', 'r');

      const buffer1 = Buffer.alloc(5);
      const buffer2 = Buffer.alloc(5);
      const buffer3 = Buffer.alloc(2);

      // First read with position=null to advance current position
      const result1 = await handle.read(buffer1, 0, 5, null);
      expect(result1.bytesRead).toBe(5);
      expect(buffer1.toString('utf8', 0, result1.bytesRead)).toBe('Hello');

      // Read from specific position (should not affect current position)
      const result2 = await handle.read(buffer2, 0, 5, 0);
      expect(result2.bytesRead).toBe(5);
      expect(buffer2.toString('utf8', 0, result2.bytesRead)).toBe('Hello');

      // Read with position=null again (should continue from previous current position)
      const result3 = await handle.read(buffer3, 0, 2, null);
      expect(result3.bytesRead).toBe(2);
      expect(buffer3.toString('utf8', 0, result3.bytesRead)).toBe(' W');

      await handle.close();
    });

    it('should write at current position when position is null', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'AAAAAAAA');
      const handle = await fs.promises.open('/test', 'r+');

      // First write with position=null should write at start
      const result1 = await handle.write(Buffer.from('BB'), 0, 2, null);
      expect(result1.bytesWritten).toBe(2);

      // Second write with position=null should continue from current position
      const result2 = await handle.write(Buffer.from('CC'), 0, 2, null);
      expect(result2.bytesWritten).toBe(2);

      await handle.close();

      const content = fs.readFileSync('/test', 'utf8');
      expect(content).toBe('BBCCAAAA');
    });

    it('should write at current position when position is undefined', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'AAAAAAAA');
      const handle = await fs.promises.open('/test', 'r+');

      // First write with position=undefined should write at start
      const result1 = await handle.write(Buffer.from('BB'), 0, 2, undefined);
      expect(result1.bytesWritten).toBe(2);

      // Second write with position=undefined should continue from current position
      const result2 = await handle.write(Buffer.from('CC'), 0, 2, undefined);
      expect(result2.bytesWritten).toBe(2);

      await handle.close();

      const content = fs.readFileSync('/test', 'utf8');
      expect(content).toBe('BBCCAAAA');
    });

    it('should not update current position when writing to specific position', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'AAAAAAAA');
      const handle = await fs.promises.open('/test', 'r+');

      // First write with position=null to advance current position
      const result1 = await handle.write(Buffer.from('BB'), 0, 2, null);
      expect(result1.bytesWritten).toBe(2);

      // Write at specific position (should not affect current position)
      const result2 = await handle.write(Buffer.from('DD'), 0, 2, 6);
      expect(result2.bytesWritten).toBe(2);

      // Write with position=null again (should continue from previous current position)
      const result3 = await handle.write(Buffer.from('CC'), 0, 2, null);
      expect(result3.bytesWritten).toBe(2);

      await handle.close();

      const content = fs.readFileSync('/test', 'utf8');
      expect(content).toBe('BBCCAADD');
    });

    it('should handle mixed read and write operations with position tracking', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'Hello World!');
      const handle = await fs.promises.open('/test', 'r+');

      const buffer = Buffer.alloc(5);

      // Read from current position (should be at start)
      const result1 = await handle.read(buffer, 0, 5, null);
      expect(result1.bytesRead).toBe(5);
      expect(buffer.toString('utf8', 0, result1.bytesRead)).toBe('Hello');

      // Write at current position (should be at position 5)
      const result2 = await handle.write(Buffer.from(' Test'), 0, 5, null);
      expect(result2.bytesWritten).toBe(5);

      // Read from current position (should be at position 10)
      const result3 = await handle.read(buffer, 0, 2, null);
      expect(result3.bytesRead).toBe(2);
      expect(buffer.toString('utf8', 0, result3.bytesRead)).toBe('d!');

      await handle.close();

      const content = fs.readFileSync('/test', 'utf8');
      expect(content).toBe('Hello Testd!');
    });

    it('should maintain separate position tracking per FileHandle instance', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'Hello World!');

      const handle1 = await fs.promises.open('/test', 'r');
      const handle2 = await fs.promises.open('/test', 'r');

      const buffer1 = Buffer.alloc(5);
      const buffer2 = Buffer.alloc(5);

      // Read from handle1
      const result1 = await handle1.read(buffer1, 0, 5, null);
      expect(result1.bytesRead).toBe(5);
      expect(buffer1.toString('utf8', 0, result1.bytesRead)).toBe('Hello');

      // Read from handle2 (should start from beginning)
      const result2 = await handle2.read(buffer2, 0, 5, null);
      expect(result2.bytesRead).toBe(5);
      expect(buffer2.toString('utf8', 0, result2.bytesRead)).toBe('Hello');

      // Read from handle1 again (should continue from position 5)
      const result3 = await handle1.read(buffer1, 0, 5, null);
      expect(result3.bytesRead).toBe(5);
      expect(buffer1.toString('utf8', 0, result3.bytesRead)).toBe(' Worl');

      await handle1.close();
      await handle2.close();
    });
  });

  describe('.readableWebStream()', () => {
    it('can read contest of a file', async () => {
      const fs = createFs();
      fs.writeFileSync('/foo', 'bar');
      const handle = await fs.promises.open('/foo', 'r');
      const stream = handle.readableWebStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      const data = fromStream(stream);
      const result = await data;
      // The new implementation returns a Uint8Array, which is correct for ReadableStream
      expect(Buffer.from(result)).toEqual(Buffer.from('bar'));
    });

    it('can read larger files in chunks', async () => {
      const fs = createFs();
      const largeContent = 'x'.repeat(32768); // Larger than the 16KB chunk size
      fs.writeFileSync('/large', largeContent);
      const handle = await fs.promises.open('/large', 'r');
      const stream = handle.readableWebStream();

      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Should have multiple chunks for a large file
      expect(chunks.length).toBeGreaterThan(1);

      // Reassemble the content
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const reassembled = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        reassembled.set(chunk, offset);
        offset += chunk.length;
      }

      expect(Buffer.from(reassembled).toString()).toBe(largeContent);
    });

    it('handles bytes type option', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'hello');
      const handle = await fs.promises.open('/test', 'r');
      const stream = handle.readableWebStream({ type: 'bytes' });
      expect(stream).toBeInstanceOf(ReadableStream);

      const data = fromStream(stream);
      const result = await data;
      expect(Buffer.from(result)).toEqual(Buffer.from('hello'));
    });
  });

  describe('EventEmitter functionality', () => {
    it('should be an instance of EventEmitter', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'content');
      const handle = await fs.promises.open('/test', 'r');

      // Check if it has EventEmitter methods
      expect(typeof handle.on).toBe('function');
      expect(typeof handle.emit).toBe('function');
      expect(typeof handle.removeListener).toBe('function');
    });

    it('should emit close event when closed', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'content');
      const handle = await fs.promises.open('/test', 'r');

      let closeEventFired = false;
      handle.on('close', () => {
        closeEventFired = true;
      });

      await handle.close();
      expect(closeEventFired).toBe(true);
    });
  });

  describe('getAsyncId()', () => {
    it('should return a numeric async ID', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'content');
      const handle = await fs.promises.open('/test', 'r');

      const asyncId = handle.getAsyncId();
      expect(typeof asyncId).toBe('number');
      expect(asyncId).toBe(handle.fd);
    });
  });

  describe('Symbol.asyncDispose', () => {
    it('should be disposable with Symbol.asyncDispose', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'content');
      const handle = await fs.promises.open('/test', 'r');

      // Check if asyncDispose exists
      const asyncDispose = (handle as any)[(Symbol as any).asyncDispose];
      expect(typeof asyncDispose).toBe('function');

      // Test that it closes the handle
      await asyncDispose.call(handle);
      // After disposal, fd should still be accessible but operations should not work as expected
      expect(typeof handle.fd).toBe('number');
    });
  });

  describe('reference counting', () => {
    it('should handle multiple close calls gracefully', async () => {
      const fs = createFs();
      fs.writeFileSync('/test', 'content');
      const handle = await fs.promises.open('/test', 'r');

      // Multiple close calls should not throw
      const closePromise1 = handle.close();
      const closePromise2 = handle.close();

      await Promise.all([closePromise1, closePromise2]);

      // Third close should resolve immediately
      await handle.close();
    });
  });
});
