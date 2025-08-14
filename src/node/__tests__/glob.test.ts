import { Volume } from '../volume';

describe('glob APIs', () => {
  const setup = () => {
    const vol = new Volume();
    // Create a test file structure
    vol.mkdirSync('/test', { recursive: true });
    vol.mkdirSync('/test/subdir', { recursive: true });
    vol.writeFileSync('/test/file1.js', 'console.log("file1");');
    vol.writeFileSync('/test/file2.ts', 'console.log("file2");');
    vol.writeFileSync('/test/file3.txt', 'hello world');
    vol.writeFileSync('/test/subdir/nested.js', 'console.log("nested");');
    vol.writeFileSync('/test/subdir/nested.py', 'print("nested")');

    return { vol };
  };

  describe('globSync', () => {
    it('should find files with basic wildcard pattern', () => {
      const { vol } = setup();
      const results = vol.globSync('*.js', { cwd: '/test' });
      expect(results).toEqual(['file1.js']);
    });

    it('should find multiple files with different patterns', () => {
      const { vol } = setup();
      const jsResults = vol.globSync('*.js', { cwd: '/test' });
      const tsResults = vol.globSync('*.ts', { cwd: '/test' });
      expect(jsResults).toEqual(['file1.js']);
      expect(tsResults).toEqual(['file2.ts']);
    });

    it('should find files recursively with ** pattern', () => {
      const { vol } = setup();
      const results = vol.globSync('**/*.js', { cwd: '/test' });
      expect(results.sort()).toEqual(['file1.js', 'subdir/nested.js']);
    });

    it('should work with absolute patterns', () => {
      const { vol } = setup();
      const results = vol.globSync('/test/*.js');
      expect(results).toEqual(['/test/file1.js']);
    });

    it('should respect cwd option', () => {
      const { vol } = setup();
      const results = vol.globSync('*.js', { cwd: '/test/subdir' });
      expect(results).toEqual(['nested.js']);
    });

    it('should exclude files with exclude option', () => {
      const { vol } = setup();
      const results = vol.globSync('*.js', {
        cwd: '/test',
        exclude: ['file1.js'],
      });
      expect(results).toEqual([]);
    });

    it('should respect maxdepth option', () => {
      const { vol } = setup();
      const results = vol.globSync('**/*.js', {
        cwd: '/test',
        maxdepth: 0,
      });
      expect(results).toEqual(['file1.js']);
    });

    it('should return empty array for non-matching pattern', () => {
      const { vol } = setup();
      const results = vol.globSync('*.xyz', { cwd: '/test' });
      expect(results).toEqual([]);
    });
  });

  describe('glob (callback)', () => {
    it('should call callback with matching files', done => {
      const { vol } = setup();
      vol.glob('*.js', { cwd: '/test' }, (err, files) => {
        expect(err).toBe(null);
        expect(files).toEqual(['file1.js']);
        done();
      });
    });

    it('should work without options parameter', done => {
      const { vol } = setup();
      vol.glob('/test/*.js', (err, files) => {
        expect(err).toBe(null);
        expect(files).toEqual(['/test/file1.js']);
        done();
      });
    });

    it('should handle errors gracefully', done => {
      const { vol } = setup();
      vol.glob('*.js', { cwd: '/nonexistent' }, (err, files) => {
        expect(err).toBe(null); // Our implementation doesn't fail on missing directories
        expect(files).toEqual([]);
        done();
      });
    });
  });

  describe('promises.glob', () => {
    async function collectFromAsyncIterator<T>(iterator: AsyncIterableIterator<T>): Promise<T[]> {
      const results: T[] = [];
      for await (const item of iterator) {
        results.push(item);
      }
      return results;
    }

    it('should return AsyncIterator yielding matching files', async () => {
      const { vol } = setup();
      const iterator = vol.promises.glob('*.js', { cwd: '/test' });
      const files = await collectFromAsyncIterator(iterator);
      expect(files).toEqual(['file1.js']);
    });

    it('should work with recursive patterns', async () => {
      const { vol } = setup();
      const iterator = vol.promises.glob('**/*.js', { cwd: '/test' });
      const files = await collectFromAsyncIterator(iterator);
      expect(files.sort()).toEqual(['file1.js', 'subdir/nested.js']);
    });

    it('should work without options', async () => {
      const { vol } = setup();
      const iterator = vol.promises.glob('/test/*.js');
      const files = await collectFromAsyncIterator(iterator);
      expect(files).toEqual(['/test/file1.js']);
    });

    it('should support withFileTypes option returning Dirent objects', async () => {
      const { vol } = setup();
      const iterator = vol.promises.glob('*.js', { cwd: '/test', withFileTypes: true });
      const dirents = await collectFromAsyncIterator(iterator);
      expect(dirents).toHaveLength(1);
      expect(dirents[0]).toHaveProperty('name', 'file1.js');
      expect(dirents[0]).toHaveProperty('isFile');
      expect(typeof dirents[0].isFile).toBe('function');
      expect(dirents[0].isFile()).toBe(true);
    });

    it('should work with multiple patterns', async () => {
      const { vol } = setup();
      const iterator = vol.promises.glob(['*.js', '*.ts'], { cwd: '/test' });
      const files = await collectFromAsyncIterator(iterator);
      expect(files.sort()).toEqual(['file1.js', 'file2.ts']);
    });
  });
});
