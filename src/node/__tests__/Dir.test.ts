import { Volume } from '../volume';

describe('Dir API Error Handling', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
    vol.mkdirSync('/test');
    vol.writeFileSync('/test/file1.txt', 'content1');
    vol.writeFileSync('/test/file2.txt', 'content2');
  });

  describe('close operations', () => {
    it('should close without error using sync', () => {
      const dir = vol.opendirSync('/test');
      expect(() => dir.closeSync()).not.toThrow();
    });

    it('should close without error using callback', done => {
      const dir = vol.opendirSync('/test');
      dir.close(err => {
        expect(err).toBeFalsy();
        done();
      });
    });

    it('should close without error using promise', async () => {
      const dir = vol.opendirSync('/test');
      await expect(dir.close()).resolves.toBeUndefined();
    });

    it('should throw ERR_DIR_CLOSED when reading from closed dir (sync)', () => {
      const dir = vol.opendirSync('/test');
      dir.closeSync();
      expect(() => dir.readSync()).toThrow();
      try {
        dir.readSync();
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CLOSED');
        expect(err.name).toMatch(/ERR_DIR_CLOSED/);
      }
    });

    it('should throw ERR_DIR_CLOSED when closing already closed dir (sync)', () => {
      const dir = vol.opendirSync('/test');
      dir.closeSync();
      expect(() => dir.closeSync()).toThrow();
      try {
        dir.closeSync();
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CLOSED');
        expect(err.name).toMatch(/ERR_DIR_CLOSED/);
      }
    });

    it('should reject ERR_DIR_CLOSED when reading from closed dir (promise)', async () => {
      const dir = vol.opendirSync('/test');
      await dir.close();
      try {
        await dir.read();
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CLOSED');
        expect(err.name).toMatch(/ERR_DIR_CLOSED/);
      }
    });

    it('should reject ERR_DIR_CLOSED when closing already closed dir (promise)', async () => {
      const dir = vol.opendirSync('/test');
      await dir.close();
      try {
        await dir.close();
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CLOSED');
        expect(err.name).toMatch(/ERR_DIR_CLOSED/);
      }
    });

    it('should callback with ERR_DIR_CLOSED when reading from closed dir', done => {
      const dir = vol.opendirSync('/test');
      dir.closeSync();
      dir.read((err, entry) => {
        expect(err).toBeTruthy();
        expect((err as any)?.code).toBe('ERR_DIR_CLOSED');
        expect((err as any)?.name).toMatch(/ERR_DIR_CLOSED/);
        expect(entry).toBeUndefined();
        done();
      });
    });

    it('should callback with ERR_DIR_CLOSED when closing already closed dir', done => {
      const dir = vol.opendirSync('/test');
      dir.closeSync();
      dir.close(err => {
        expect(err).toBeTruthy();
        expect((err as any)?.code).toBe('ERR_DIR_CLOSED');
        expect((err as any)?.name).toMatch(/ERR_DIR_CLOSED/);
        done();
      });
    });
  });

  describe('concurrent operations', () => {
    it('should throw ERR_DIR_CONCURRENT_OPERATION when sync read during async operation', done => {
      const dir = vol.opendirSync('/test');

      // Start an async read
      dir.read((err, entry) => {
        expect(err).toBeNull();
        expect(entry).toBeTruthy();

        // Now sync operations should work again
        expect(() => dir.readSync()).not.toThrow();
        done();
      });

      // Try a sync operation while async is pending
      try {
        dir.readSync();
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CONCURRENT_OPERATION');
        expect(err.name).toMatch(/ERR_DIR_CONCURRENT_OPERATION/);
      }
    });

    it('should throw ERR_DIR_CONCURRENT_OPERATION when sync close during async operation', done => {
      const dir = vol.opendirSync('/test');

      // Start an async read
      dir.read((err, entry) => {
        expect(err).toBeNull();
        expect(entry).toBeTruthy();
        done();
      });

      // Try a sync close while async is pending
      try {
        dir.closeSync();
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('ERR_DIR_CONCURRENT_OPERATION');
        expect(err.name).toMatch(/ERR_DIR_CONCURRENT_OPERATION/);
      }
    });
  });

  describe('path property', () => {
    it('should have the correct path property', () => {
      const dir = vol.opendirSync('/test');
      expect(dir.path).toBe('/test');
    });

    it('should have the correct path property for nested directories', () => {
      vol.mkdirSync('/test/nested');
      const dir = vol.opendirSync('/test/nested');
      expect(dir.path).toBe('/test/nested');
    });
  });

  describe('async iterator', () => {
    it('should work with for-await-of', async () => {
      const dir = vol.opendirSync('/test');
      const entries: string[] = [];

      for await (const entry of dir) {
        entries.push(String(entry.name));
      }

      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries.length).toBe(2);
    });
  });
});
