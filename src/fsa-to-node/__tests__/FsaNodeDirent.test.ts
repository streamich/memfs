import { memfs, NestedDirectoryJSON } from '../..';
import { nodeToFsa } from '../../node-to-fsa';
import { IDirent } from '../../node/types/misc';
import { FsaNodeFs } from '../FsaNodeFs';
import { onlyOnNode20 } from '../../__tests__/util';

const setup = (json: NestedDirectoryJSON | null = null, mode: 'read' | 'readwrite' = 'readwrite') => {
  const { fs: mfs, vol } = memfs({ mountpoint: json });
  const dir = nodeToFsa(mfs, '/mountpoint', { mode, syncHandleAllowed: true });
  const fs = new FsaNodeFs(dir);
  return { fs, mfs, vol, dir };
};

onlyOnNode20('FsaNodeDirent', () => {
  describe('parentPath property', () => {
    test('should set parentPath correctly in readdir', async () => {
      const { fs } = setup({
        'file1.txt': 'content1',
        'file2.txt': 'content2',
      });

      const dirents = (await fs.promises.readdir('/', {
        withFileTypes: true,
      })) as IDirent[];

      expect(dirents.length).toBeGreaterThan(0);
      dirents.forEach(dirent => {
        expect(dirent.parentPath).toBe('/');
        expect(dirent.name).toBeTruthy();
      });
    });

    test('should set parentPath correctly for nested directories', async () => {
      const { fs } = setup({
        'dir1/file1.txt': 'content1',
        'dir1/file2.txt': 'content2',
      });

      const dirents = (await fs.promises.readdir('/dir1', {
        withFileTypes: true,
      })) as IDirent[];

      expect(dirents.length).toBeGreaterThan(0);
      dirents.forEach(dirent => {
        expect(dirent.parentPath).toBe('/dir1');
      });
    });

    test('should set parentPath correctly for deeply nested directories', async () => {
      const { fs } = setup({
        'a/b/c/file.txt': 'content',
      });

      const dirents = (await fs.promises.readdir('/a/b/c', {
        withFileTypes: true,
      })) as IDirent[];

      expect(dirents.length).toBeGreaterThan(0);
      dirents.forEach(dirent => {
        expect(dirent.parentPath).toBe('/a/b/c');
      });
    });

    test('should distinguish between files and directories while maintaining parentPath', async () => {
      const { fs } = setup({
        'file.txt': 'content',
        'subdir/nested.txt': 'nested content',
      });

      const dirents = (await fs.promises.readdir('/', {
        withFileTypes: true,
      })) as IDirent[];

      const file = dirents.find(d => d.name === 'file.txt');
      const subdir = dirents.find(d => d.name === 'subdir');

      expect(file?.parentPath).toBe('/');
      expect(file?.isFile()).toBe(true);
      expect(file?.isDirectory()).toBe(false);

      expect(subdir?.parentPath).toBe('/');
      expect(subdir?.isDirectory()).toBe(true);
      expect(subdir?.isFile()).toBe(false);
    });

    test('should return false for block device checks', async () => {
      const { fs } = setup({
        'file.txt': 'content',
      });

      const dirents = (await fs.promises.readdir('/', {
        withFileTypes: true,
      })) as IDirent[];

      dirents.forEach(dirent => {
        expect(dirent.isBlockDevice()).toBe(false);
        expect(dirent.isCharacterDevice()).toBe(false);
        expect(dirent.isSymbolicLink()).toBe(false);
        expect(dirent.isFIFO()).toBe(false);
        expect(dirent.isSocket()).toBe(false);
      });
    });
  });
});
