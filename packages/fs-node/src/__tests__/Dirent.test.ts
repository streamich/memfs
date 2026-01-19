import { create } from './util';
import Dirent from '../Dirent';

describe('Dirent', () => {
  describe('parentPath property', () => {
    it('should have empty parentPath when constructed directly', () => {
      const dirent = new Dirent();
      expect(dirent.parentPath).toBe('');
    });

    it('should set parentPath for deeply nested files', () => {
      const vol = create({
        '/a/b/c/d/file.txt': 'content',
      });
      const dirents = vol.readdirSync('/a/b/c/d', { withFileTypes: true });
      expect(dirents.length).toBe(1);
      const dirent = dirents[0] as Dirent;
      expect(dirent.parentPath).toBe('/a/b/c/d');
    });

    it('should work correctly in readdirSync with withFileTypes', () => {
      const vol = create({
        '/dir1/file1.txt': 'content1',
        '/dir1/file2.txt': 'content2',
        '/dir1/subdir/file3.txt': 'content3',
      });

      const dirents = vol.readdirSync('/dir1', { withFileTypes: true }) as Dirent[];
      const parentPaths = dirents.map(d => d.parentPath);
      expect(parentPaths).toEqual(['/dir1', '/dir1', '/dir1']);
    });

    it('should work correctly in readdirSync for root directory', () => {
      const vol = create({
        '/file1.txt': 'content1',
        '/dir1/file2.txt': 'content2',
      });

      const dirents = vol.readdirSync('/', { withFileTypes: true }) as Dirent[];
      const parentPaths = dirents.map(d => d.parentPath);
      expect(parentPaths.every(p => p === '/')).toBe(true);
    });

    it('should work correctly in recursive readdirSync', () => {
      const vol = create({
        '/a/file1.txt': 'content1',
        '/a/b/file2.txt': 'content2',
        '/a/b/c/file3.txt': 'content3',
      });

      const dirents = vol.readdirSync('/a', { recursive: true, withFileTypes: true }) as Dirent[];
      const direntsByParentPath = dirents.reduce(
        (acc, d) => {
          if (!acc[d.parentPath]) acc[d.parentPath] = [];
          acc[d.parentPath].push(String(d.name));
          return acc;
        },
        {} as Record<string, string[]>,
      );

      // Sort entries within each path for consistent comparison
      Object.keys(direntsByParentPath).forEach(path => {
        direntsByParentPath[path].sort();
      });

      expect(direntsByParentPath).toEqual({
        '/a': ['b', 'file1.txt'],
        '/a/b': ['c', 'file2.txt'],
        '/a/b/c': ['file3.txt'],
      });
    });

    it('should work correctly in Dir.readSync', () => {
      const vol = create({
        '/x/file1.txt': 'a',
        '/x/file2.txt': 'b',
      });
      const dir = vol.opendirSync('/x');
      try {
        const dirent1 = dir.readSync() as Dirent;
        expect(dirent1.parentPath).toBe('/x');
        const dirent2 = dir.readSync() as Dirent;
        expect(dirent2.parentPath).toBe('/x');
        const dirent3 = dir.readSync();
        expect(dirent3).toBe(null);
      } finally {
        dir.closeSync();
      }
    });

    it('should work correctly in Dir async iteration', async () => {
      const vol = create({
        '/y/file1.txt': 'a',
        '/y/file2.txt': 'b',
      });
      const dir = vol.opendirSync('/y');
      const parentPaths: string[] = [];
      try {
        for await (const dirent of dir) {
          parentPaths.push((dirent as Dirent).parentPath);
        }
      } finally {
        dir.closeSync();
      }
      expect(parentPaths).toEqual(['/y', '/y']);
    });
  });

  describe('Dirent methods work alongside parentPath', () => {
    it('isFile() works with parentPath', () => {
      const vol = create({
        '/file.txt': 'content',
      });
      const dirents = vol.readdirSync('/', { withFileTypes: true }) as Dirent[];
      const fileDirent = dirents[0];
      expect(fileDirent.parentPath).toBe('/');
      expect(fileDirent.isFile()).toBe(true);
    });

    it('isDirectory() works with parentPath', () => {
      const vol = create({
        '/dir/file.txt': 'content',
      });
      const dirents = vol.readdirSync('/', { withFileTypes: true }) as Dirent[];
      const dirDirent = dirents.find(d => d.name === 'dir')!;
      expect(dirDirent.parentPath).toBe('/');
      expect(dirDirent.isDirectory()).toBe(true);
    });
  });
});
