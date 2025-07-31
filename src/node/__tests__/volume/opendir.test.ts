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
});
