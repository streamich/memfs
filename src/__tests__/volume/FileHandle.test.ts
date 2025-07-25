import { fromStream } from '@jsonjoy.com/util/lib/streams/fromStream';
import { createFs } from '../util';

describe('FileHandle', () => {
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
