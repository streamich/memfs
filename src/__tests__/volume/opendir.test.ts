import { Volume } from '../..';

describe('opendir', () => {
  it('should provide fs.opendir (callback)', done => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file1.txt', 'content1');
    vol.writeFileSync('/test/file2.txt', 'content2');

    const fs = vol as any;
    fs.opendir('/test', (err, dir) => {
      expect(err).toBeNull();
      expect(dir).toBeDefined();
      expect(typeof dir.read).toBe('function');
      expect(typeof dir.close).toBe('function');
      expect(typeof dir.readSync).toBe('function');
      expect(typeof dir.closeSync).toBe('function');

      dir.close(err2 => {
        expect(err2).toBeFalsy();
        done();
      });
    });
  });

  it('should provide fs.opendirSync (synchronous)', () => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file1.txt', 'content1');
    vol.writeFileSync('/test/file2.txt', 'content2');

    const dir = vol.opendirSync('/test');
    expect(dir).toBeDefined();
    expect(typeof dir.read).toBe('function');
    expect(typeof dir.close).toBe('function');
    expect(typeof dir.readSync).toBe('function');
    expect(typeof dir.closeSync).toBe('function');

    const entries: string[] = [];
    let entry;
    while ((entry = dir.readSync()) !== null) {
      entries.push(entry.name);
    }

    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
    expect(entries.length).toBe(2);

    dir.closeSync();
  });

  it('should provide fs.promises.opendir', async () => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file1.txt', 'content1');
    vol.writeFileSync('/test/file2.txt', 'content2');

    const dir = await vol.promises.opendir('/test');
    expect(dir).toBeDefined();
    expect(typeof dir.read).toBe('function');
    expect(typeof dir.close).toBe('function');
    expect(typeof dir.readSync).toBe('function');
    expect(typeof dir.closeSync).toBe('function');

    const entries: string[] = [];
    let entry;
    while ((entry = await dir.read()) !== null) {
      entries.push(entry.name);
    }

    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
    expect(entries.length).toBe(2);

    await dir.close();
  });

  it('should support options parameter in all variants', async () => {
    const vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file1.txt', 'content1');

    // Test sync with options
    const dir1 = vol.opendirSync('/test', { encoding: 'utf8', bufferSize: 16 });
    expect(dir1).toBeDefined();
    dir1.closeSync();

    // Test callback with options
    await new Promise<void>((resolve, reject) => {
      vol.opendir('/test', { encoding: 'utf8', bufferSize: 16 }, (err, dir) => {
        if (err) reject(err);
        else {
          expect(dir).toBeDefined();
          dir!.closeSync();
          resolve();
        }
      });
    });

    // Test promise with options
    const dir3 = await vol.promises.opendir('/test', { encoding: 'utf8', bufferSize: 16 });
    expect(dir3).toBeDefined();
    await dir3.close();
  });

  it('should work with memfs fs export', done => {
    const { fs } = require('../..');

    // Clear any existing state
    fs.rmSync('/', { recursive: true, force: true });
    fs.mkdirSync('/test');
    fs.writeFileSync('/test/file1.txt', 'content1');
    fs.writeFileSync('/test/file2.txt', 'content2');

    // Test that all three variants exist
    expect(typeof fs.opendir).toBe('function');
    expect(typeof fs.opendirSync).toBe('function');
    expect(typeof fs.promises.opendir).toBe('function');

    // Test callback version
    fs.opendir('/test', (err, dir) => {
      expect(err).toBeNull();
      expect(dir).toBeDefined();

      const entries: string[] = [];

      function readNext() {
        dir.read((err, entry) => {
          if (err) {
            done(err);
            return;
          }

          if (entry === null) {
            expect(entries).toContain('file1.txt');
            expect(entries).toContain('file2.txt');
            dir.close(done);
            return;
          }

          entries.push(entry.name);
          readNext();
        });
      }

      readNext();
    });
  });

  // New tests for Dir functionality and error handling
  describe('Dir error handling', () => {
    it('should throw ERR_DIR_CLOSED when reading from closed directory (sync)', () => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');

      const dir = vol.opendirSync('/test');
      dir.closeSync();

      expect(() => dir.readSync()).toThrow('ERR_DIR_CLOSED');
    });

    it('should throw ERR_DIR_CLOSED when closing already closed directory (sync)', () => {
      const vol = new Volume();
      vol.mkdirSync('/test');

      const dir = vol.opendirSync('/test');
      dir.closeSync();

      expect(() => dir.closeSync()).toThrow('ERR_DIR_CLOSED');
    });

    it('should call callback with ERR_DIR_CLOSED when reading from closed directory (async)', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');

      const dir = vol.opendirSync('/test');
      dir.closeSync();

      dir.read((err, entry) => {
        expect(err).toBeDefined();
        expect((err as any)?.code).toBe('ERR_DIR_CLOSED');
        expect(entry).toBeUndefined();
        done();
      });
    });

    it('should call callback with ERR_DIR_CLOSED when closing already closed directory (async)', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');

      const dir = vol.opendirSync('/test');
      dir.closeSync();

      dir.close(err => {
        expect(err).toBeDefined();
        expect((err as any)?.code).toBe('ERR_DIR_CLOSED');
        done();
      });
    });

    it('should reject promise with ERR_DIR_CLOSED when closing already closed directory', async () => {
      const vol = new Volume();
      vol.mkdirSync('/test');

      const dir = vol.opendirSync('/test');
      dir.closeSync();

      await expect(dir.close()).rejects.toMatchObject({
        code: 'ERR_DIR_CLOSED'
      });
    });
  });

  describe('Dir concurrent operations', () => {
    it('should throw ERR_DIR_CONCURRENT_OPERATION when sync operation attempted during async (readSync)', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');

      const dir = vol.opendirSync('/test');

      // Start async read operation
      dir.read((err, entry) => {
        // This should complete successfully
        expect(err).toBeNull();
        done();
      });

      // Immediately try sync operation - should throw
      expect(() => dir.readSync()).toThrow('ERR_DIR_CONCURRENT_OPERATION');
    });

    it('should throw ERR_DIR_CONCURRENT_OPERATION when sync operation attempted during async (closeSync)', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');

      const dir = vol.opendirSync('/test');

      // Start async close operation
      dir.close(err => {
        // This should complete successfully  
        expect(err).toBeFalsy();
        done();
      });

      // Immediately try sync operation - should throw
      expect(() => dir.closeSync()).toThrow('ERR_DIR_CONCURRENT_OPERATION');
    });

    it('should queue async operations properly', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');
      vol.writeFileSync('/test/file2.txt', 'content2');

      const dir = vol.opendirSync('/test');
      const results: string[] = [];

      // Start multiple read operations
      dir.read((err, entry) => {
        expect(err).toBeNull();
        if (entry) results.push(String(entry.name));
      });

      dir.read((err, entry) => {
        expect(err).toBeNull();
        if (entry) results.push(String(entry.name));
      });

      dir.read((err, entry) => {
        expect(err).toBeNull();
        expect(entry).toBeNull(); // End of directory
        expect(results.length).toBe(2);
        expect(results).toContain('file1.txt');
        expect(results).toContain('file2.txt');
        
        dir.close(done);
      });
    });
  });

  describe('Dir AsyncIterator', () => {
    it('should support manual async iteration', async () => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');
      vol.writeFileSync('/test/file2.txt', 'content2');
      vol.writeFileSync('/test/file3.txt', 'content3');

      const dir = vol.opendirSync('/test');
      const entries: string[] = [];

      // Use the async iterator manually
      const iterator = (dir as any)[Symbol.asyncIterator]();
      let result = await iterator.next();
      
      while (!result.done) {
        entries.push(String(result.value.name));
        result = await iterator.next();
      }

      expect(entries.length).toBe(3);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries).toContain('file3.txt');
    });

    it('should handle empty directories in AsyncIterator', async () => {
      const vol = new Volume();
      vol.mkdirSync('/empty');

      const dir = vol.opendirSync('/empty');
      const entries: string[] = [];

      // Use the async iterator manually
      const iterator = (dir as any)[Symbol.asyncIterator]();
      let result = await iterator.next();
      
      while (!result.done) {
        entries.push(String(result.value.name));
        result = await iterator.next();
      }

      expect(entries.length).toBe(0);
    });
  });

  describe('Dir buffering behavior', () => {
    it('should maintain consistent read order with buffering', async () => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/a.txt', 'content');
      vol.writeFileSync('/test/b.txt', 'content');
      vol.writeFileSync('/test/c.txt', 'content');

      const dir = vol.opendirSync('/test');
      const entries: string[] = [];

      // Mix of sync and async reads
      const entry1 = dir.readSync();
      if (entry1) entries.push(String(entry1.name));

      const entry2 = await new Promise<any>((resolve, reject) => {
        dir.read((err, entry) => {
          if (err) reject(err);
          else resolve(entry);
        });
      });
      if (entry2) entries.push(String(entry2.name));

      const entry3 = dir.readSync();
      if (entry3) entries.push(String(entry3.name));

      expect(entries.length).toBe(3);
      expect(entries).toContain('a.txt');
      expect(entries).toContain('b.txt');
      expect(entries).toContain('c.txt');

      dir.closeSync();
    });

    it('should return null when directory is exhausted', () => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');

      const dir = vol.opendirSync('/test');

      // Read the only entry
      const entry1 = dir.readSync();
      expect(entry1).not.toBeNull();
      expect(String(entry1!.name)).toBe('file1.txt');

      // Next read should return null
      const entry2 = dir.readSync();
      expect(entry2).toBeNull();

      dir.closeSync();
    });

    it('should return null when directory is exhausted (async)', done => {
      const vol = new Volume();
      vol.mkdirSync('/test');
      vol.writeFileSync('/test/file1.txt', 'content1');

      const dir = vol.opendirSync('/test');

      // Read the only entry
      dir.read((err, entry1) => {
        expect(err).toBeNull();
        expect(entry1).not.toBeNull();
        expect(entry1!.name).toBe('file1.txt');

        // Next read should return null
        dir.read((err, entry2) => {
          expect(err).toBeNull();
          expect(entry2).toBeNull();
          dir.close(done);
        });
      });
    });
  });
});
