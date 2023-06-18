import { IFsWithVolume, NestedDirectoryJSON, memfs } from '../..';
import { AMODE } from '../../consts/AMODE';
import { nodeToFsa } from '../../node-to-fsa';
import { IDirent, IStats } from '../../node/types/misc';
import { FsaNodeFs } from '../FsaNodeFs';
import { tick, until, of } from 'thingies';
import { onlyOnNode20 } from '../../__tests__/util';

const setup = (json: NestedDirectoryJSON | null = null, mode: 'read' | 'readwrite' = 'readwrite') => {
  const mfs = memfs({ mountpoint: json }) as IFsWithVolume;
  const dir = nodeToFsa(mfs, '/mountpoint', { mode, syncHandleAllowed: true });
  const fs = new FsaNodeFs(dir);
  return { fs, mfs, dir };
};

onlyOnNode20('FsaNodeFs', () => {
  describe('.mkdir()', () => {
    test('can create a sub-folder', async () => {
      const { fs, mfs } = setup();
      await new Promise<void>((resolve, reject) =>
        fs.mkdir('/test', err => {
          if (err) return reject(err);
          return resolve();
        }),
      );
      expect(mfs.statSync('/mountpoint/test').isDirectory()).toBe(true);
    });

    test('throws when creating sub-sub-folder', async () => {
      const { fs } = setup();
      try {
        await new Promise<void>((resolve, reject) =>
          fs.mkdir('/test/subtest', err => {
            if (err) return reject(err);
            return resolve();
          }),
        );
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }
    });

    test('can create sub-sub-folder with "recursive" flag', async () => {
      const { fs, mfs } = setup();
      await new Promise<void>((resolve, reject) =>
        fs.mkdir('/test/subtest', { recursive: true }, err => {
          if (err) return reject(err);
          return resolve();
        }),
      );
      expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
    });

    test('can create sub-sub-folder with "recursive" flag with Promises API', async () => {
      const { fs, mfs } = setup();
      await fs.promises.mkdir('/test/subtest', { recursive: true });
      expect(mfs.statSync('/mountpoint/test/subtest').isDirectory()).toBe(true);
    });

    test('cannot create a folder over a file', async () => {
      const { fs } = setup({ file: 'test' });
      try {
        await fs.promises.mkdir('/file/folder', { recursive: true });
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOTDIR');
      }
    });
  });

  describe('.mkdtemp()', () => {
    test('can create a temporary folder', async () => {
      const { fs, mfs } = setup();
      const dirname = (await fs.promises.mkdtemp('prefix--')) as string;
      expect(dirname.startsWith('prefix--')).toBe(true);
      expect(mfs.statSync('/mountpoint/' + dirname).isDirectory()).toBe(true);
    });
  });

  describe('.rmdir()', () => {
    test('can remove an empty folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      await fs.promises.rmdir('/empty-folder');
      expect(mfs.__vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
    });

    test('throws when attempts to remove non-empty folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      try {
        await fs.promises.rmdir('/folder');
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOTEMPTY');
        expect(mfs.__vol.toJSON()).toStrictEqual({
          '/mountpoint/folder/file': 'test',
          '/mountpoint/empty-folder': null,
        });
      }
    });

    test('can remove non-empty directory recursively', async () => {
      const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
      await fs.promises.rmdir('/folder', { recursive: true });
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/empty-folder': null,
      });
    });
  });

  describe('.rm()', () => {
    test('can remove an empty folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      await fs.promises.rm('/empty-folder');
      expect(mfs.__vol.toJSON()).toStrictEqual({ '/mountpoint/folder/file': 'test' });
    });

    test('throws when attempts to remove non-empty folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      try {
        await fs.promises.rm('/folder');
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOTEMPTY');
        expect(mfs.__vol.toJSON()).toStrictEqual({
          '/mountpoint/folder/file': 'test',
          '/mountpoint/empty-folder': null,
        });
      }
    });

    test('can remove non-empty directory recursively', async () => {
      const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
      await fs.promises.rm('/folder', { recursive: true });
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/empty-folder': null,
      });
    });

    test('throws if path does not exist', async () => {
      const { fs, mfs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
      try {
        await fs.promises.rm('/lala/lulu', { recursive: true });
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
        expect(mfs.__vol.toJSON()).toStrictEqual({
          '/mountpoint/folder/subfolder/file': 'test',
          '/mountpoint/empty-folder': null,
        });
      }
    });

    test('does not throw, if path does not exist, but "force" flag set', async () => {
      const { fs } = setup({ folder: { subfolder: { file: 'test' } }, 'empty-folder': null });
      await fs.promises.rm('/lala/lulu', { recursive: true, force: true });
    });
  });

  describe('.unlink()', () => {
    test('can remove a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const res = await fs.promises.unlink('/folder/file');
      expect(res).toBe(undefined);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder': null,
        '/mountpoint/empty-folder': null,
      });
    });

    test('cannot delete a folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      try {
        await fs.promises.unlink('/folder');
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('EISDIR');
        expect(mfs.__vol.toJSON()).toStrictEqual({
          '/mountpoint/folder/file': 'test',
          '/mountpoint/empty-folder': null,
        });
      }
    });

    test('throws when deleting non-existing file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      try {
        await fs.promises.unlink('/folder/not-a-file');
        throw new Error('Expected error');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
        expect(mfs.__vol.toJSON()).toStrictEqual({
          '/mountpoint/folder/file': 'test',
          '/mountpoint/empty-folder': null,
        });
      }
    });
  });

  describe('.readFile()', () => {
    test('can read file contents', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const data = await fs.promises.readFile('/folder/file');
      expect(data.toString()).toBe('test');
    });

    test('can read file by file handle', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const handle = await fs.promises.open('/folder/file');
      expect(typeof handle).toBe('object');
      const data = await fs.promises.readFile(handle);
      expect(data.toString()).toBe('test');
    });

    test('can read file by file descriptor', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const fd = await new Promise<number>(resolve => {
        fs.open('/folder/file', 'r', (err, fd) => resolve(fd!));
      });
      expect(typeof fd).toBe('number');
      const data = await new Promise<string>(resolve => {
        fs.readFile(fd, { encoding: 'utf8' }, (err, data) => resolve(data as string));
      });
      expect(data).toBe('test');
    });

    test('cannot read from closed file descriptor', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const fd = await new Promise<number>(resolve => {
        fs.open('/folder/file', 'r', (err, fd) => resolve(fd!));
      });
      expect(typeof fd).toBe('number');
      await new Promise<void>(resolve => {
        fs.close(fd, () => resolve());
      });
      try {
        await new Promise<string>((resolve, reject) => {
          fs.readFile(fd, { encoding: 'utf8' }, (err, data) => reject(err));
        });
        throw new Error('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe('EBADF');
      }
    });
  });

  describe('.truncate()', () => {
    test('can truncate a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const res = await new Promise<unknown>((resolve, reject) => {
        fs.truncate('/folder/file', 2, (err, res) => (err ? reject(err) : resolve(res)));
      });
      expect(res).toBe(undefined);
      expect(mfs.readFileSync('/mountpoint/folder/file', 'utf8')).toBe('te');
    });
  });

  describe('.ftruncate()', () => {
    test('can truncate a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null });
      const handle = await fs.promises.open('/folder/file');
      const res = await new Promise<unknown>((resolve, reject) => {
        fs.ftruncate(handle.fd, 3, (err, res) => (err ? reject(err) : resolve(res)));
      });
      expect(res).toBe(undefined);
      expect(mfs.readFileSync('/mountpoint/folder/file', 'utf8')).toBe('tes');
    });
  });

  describe('.readdir()', () => {
    test('can read directory contents as strings', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const res = (await fs.promises.readdir('/')) as string[];
      expect(res.length).toBe(3);
      expect(res.includes('folder')).toBe(true);
      expect(res.includes('empty-folder')).toBe(true);
      expect(res.includes('f.html')).toBe(true);
    });

    test('can read directory contents with "withFileTypes" flag set', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const list = (await fs.promises.readdir('/', { withFileTypes: true })) as IDirent[];
      expect(list.length).toBe(3);
      const names = list.map(item => item.name);
      expect(names).toStrictEqual(['empty-folder', 'f.html', 'folder']);
      expect(list.find(item => item.name === 'folder')?.isDirectory()).toBe(true);
      expect(list.find(item => item.name === 'empty-folder')?.isDirectory()).toBe(true);
      expect(list.find(item => item.name === 'f.html')?.isFile()).toBe(true);
      expect(list.find(item => item.name === 'f.html')?.isDirectory()).toBe(false);
    });
  });

  describe('.appendFile()', () => {
    test('can create a file', async () => {
      const { fs, mfs } = setup({});
      await fs.promises.appendFile('/test.txt', 'a');
      expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('a');
    });

    test('can append to a file', async () => {
      const { fs, mfs } = setup({});
      await fs.promises.appendFile('/test.txt', 'a');
      await fs.promises.appendFile('/test.txt', 'b');
      expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('ab');
    });

    test('can append to a file - 2', async () => {
      const { fs, mfs } = setup({ file: '123' });
      await fs.promises.appendFile('file', 'x');
      expect(mfs.readFileSync('/mountpoint/file', 'utf8')).toBe('123x');
    });
  });

  describe('.write()', () => {
    test('can write to a file', async () => {
      const { fs, mfs } = setup({});
      const fd = await new Promise<number>((resolve, reject) =>
        fs.open('/test.txt', 'w', (err, fd) => {
          if (err) reject(err);
          else resolve(fd!);
        }),
      );
      const [bytesWritten, data] = await new Promise<[number, any]>((resolve, reject) => {
        fs.write(fd, 'a', (err, bytesWritten, data) => {
          if (err) reject(err);
          else resolve([bytesWritten, data]);
        });
      });
      expect(bytesWritten).toBe(1);
      expect(data).toBe('a');
      expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('a');
    });

    test('can write to a file twice sequentially', async () => {
      const { fs, mfs } = setup({});
      const fd = await new Promise<number>((resolve, reject) =>
        fs.open('/test.txt', 'w', (err, fd) => {
          if (err) reject(err);
          else resolve(fd!);
        }),
      );
      const res1 = await new Promise<[number, any]>((resolve, reject) => {
        fs.write(fd, 'a', (err, bytesWritten, data) => {
          if (err) reject(err);
          else resolve([bytesWritten, data]);
        });
      });
      expect(res1[0]).toBe(1);
      expect(res1[1]).toBe('a');
      const res2 = await new Promise<[number, any]>((resolve, reject) => {
        fs.write(fd, 'bc', (err, bytesWritten, data) => {
          if (err) reject(err);
          else resolve([bytesWritten, data]);
        });
      });
      expect(res2[0]).toBe(2);
      expect(res2[1]).toBe('bc');
      expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('abc');
    });
  });

  describe('.writev()', () => {
    test('can write to a file two buffers', async () => {
      const { fs, mfs } = setup({});
      const fd = await new Promise<number>((resolve, reject) =>
        fs.open('/test.txt', 'w', (err, fd) => {
          if (err) reject(err);
          else resolve(fd!);
        }),
      );
      const [bytesWritten, data] = await new Promise<[number, any]>((resolve, reject) => {
        const buffers = [Buffer.from('a'), Buffer.from('b')];
        fs.writev(fd, buffers, (err, bytesWritten, data) => {
          if (err) reject(err);
          else resolve([bytesWritten!, data]);
        });
      });
      expect(bytesWritten).toBe(2);
      expect(mfs.readFileSync('/mountpoint/test.txt', 'utf8')).toBe('ab');
    });
  });

  describe('.exists()', () => {
    test('can works for folders and files', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const exists = async (path: string): Promise<boolean> => {
        return new Promise(resolve => {
          fs.exists(path, exists => resolve(exists));
        });
      };
      expect(await exists('/folder')).toBe(true);
      expect(await exists('/folder/file')).toBe(true);
      expect(await exists('/folder/not-a-file')).toBe(false);
      expect(await exists('/f.html')).toBe(true);
      expect(await exists('/empty-folder')).toBe(true);
      expect(await exists('/')).toBe(true);
      expect(await exists('/asdf')).toBe(false);
      expect(await exists('asdf')).toBe(false);
    });
  });

  describe('.access()', () => {
    describe('files', () => {
      test('succeeds on file existence check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder/file', AMODE.F_OK);
      });

      test('succeeds on file "read" check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder/file', AMODE.R_OK);
      });

      test('succeeds on file "write" check, on writable file system', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder/file', AMODE.W_OK);
      });

      test('fails on file "write" check, on read-only file system', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' }, 'read');
        try {
          await fs.promises.access('/folder/file', AMODE.W_OK);
          throw new Error('should not be here');
        } catch (error) {
          expect(error.code).toBe('EACCESS');
        }
      });

      test('fails on file "execute" check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        try {
          await fs.promises.access('/folder/file', AMODE.X_OK);
          throw new Error('should not be here');
        } catch (error) {
          expect(error.code).toBe('EACCESS');
        }
      });
    });

    describe('directories', () => {
      test('succeeds on folder existence check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder', AMODE.F_OK);
      });

      test('succeeds on folder "read" check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder', AMODE.R_OK);
      });

      test('succeeds on folder "write" check, on writable file system', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        await fs.promises.access('/folder', AMODE.W_OK);
      });

      test('fails on folder "write" check, on read-only file system', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' }, 'read');
        try {
          await fs.promises.access('/folder', AMODE.W_OK);
          throw new Error('should not be here');
        } catch (error) {
          expect(error.code).toBe('EACCESS');
        }
      });

      test('fails on folder "execute" check', async () => {
        const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
        try {
          await fs.promises.access('/folder', AMODE.X_OK);
          throw new Error('should not be here');
        } catch (error) {
          expect(error.code).toBe('EACCESS');
        }
      });
    });
  });

  describe('.rename()', () => {
    test('can rename a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      await fs.promises.rename('/folder/file', '/folder/file2');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file2': 'test',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });
  });

  describe('.stat()', () => {
    test('can stat a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.stat('/folder/file');
      expect(stats.isFile()).toBe(true);
    });

    test('can retrieve file size', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.stat('/folder/file');
      expect(stats.size).toBe(4);
    });

    test('can stat a folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.stat('/folder');
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });

    test('throws on non-existing path', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      try {
        const stats = await fs.promises.stat('/folder/abc');
        throw new Error('should not be here');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }
    });
  });

  describe('.lstat()', () => {
    test('can stat a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.lstat('/folder/file');
      expect(stats.isFile()).toBe(true);
    });

    test('can retrieve file size', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.lstat('/folder/file');
      expect(stats.size).toBe(4);
    });

    test('can stat a folder', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stats = await fs.promises.lstat('/folder');
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });

    test('throws on non-existing path', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      try {
        await fs.promises.lstat('/folder/abc');
        throw new Error('should not be here');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }
    });
  });

  describe('.fstat()', () => {
    test('can stat a file', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'r');
      const stats = await new Promise<IStats>((resolve, reject) => {
        fs.fstat(handle.fd, (error, stats) => {
          if (error) reject(error);
          else resolve(stats!);
        });
      });
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('.realpath()', () => {
    test('returns file path', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const path = await fs.promises.realpath('folder/file');
      expect(path).toBe('/folder/file');
    });
  });

  describe('.copyFile()', () => {
    test('can copy a file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      await fs.promises.copyFile('/folder/file', '/folder/file2');
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/folder/file2': 'test',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });
  });

  describe('.writeFile()', () => {
    test('can create a new file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const res = await new Promise<void>((resolve, reject) => {
        fs.writeFile('/folder/foo', 'bar', error => {
          if (error) reject(error);
          else resolve();
        });
      });
      expect(res).toBe(undefined);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/folder/foo': 'bar',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });
  });

  describe('.read()', () => {
    test('can read from a file at offset into Buffer', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'r');
      const [buffer, length] = await new Promise<[Buffer, number]>((resolve, reject) => {
        const buffer = Buffer.alloc(4);
        fs.read(handle.fd, buffer, 0, 2, 1, (error, bytesRead, buffer) => {
          if (error) reject(error);
          else resolve([buffer as Buffer, bytesRead!]);
        });
      });
      expect(length).toBe(2);
      expect(buffer.slice(0, 2).toString()).toBe('es');
    });

    test('can read from a file at offset into Uint8Array', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'r');
      const [buffer, length] = await new Promise<[Buffer, number]>((resolve, reject) => {
        const buffer = new Uint8Array(4);
        fs.read(handle.fd, buffer, 0, 2, 1, (error, bytesRead, buffer) => {
          if (error) reject(error);
          else resolve([buffer as Buffer, bytesRead!]);
        });
      });
      expect(length).toBe(2);
      expect(buffer[0]).toBe(101);
      expect(buffer[1]).toBe(115);
    });
  });

  describe('.createWriteStream()', () => {
    test('can use stream to write to a new file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stream = fs.createWriteStream('/folder/file2');
      stream.write(Buffer.from('A'));
      stream.write(Buffer.from('BC'));
      stream.write(Buffer.from('DEF'));
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(6);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/folder/file2': 'ABCDEF',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('can use stream to write to a new file using strings', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stream = fs.createWriteStream('/folder/file2');
      stream.write('A');
      stream.write('BC');
      stream.write('DEF');
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(6);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'test',
        '/mountpoint/folder/file2': 'ABCDEF',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('can use stream to overwrite existing file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stream = fs.createWriteStream('/folder/file');
      stream.write(Buffer.from('A'));
      stream.write(Buffer.from('BC'));
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(3);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'ABC',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('can write by file descriptor', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'a');
      const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a' });
      stream.write(Buffer.from('BC'));
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(2);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'tBCt',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('closes file once stream ends', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'a');
      const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a' });
      stream.write(Buffer.from('BC'));
      const stat = async () =>
        await new Promise((resolve, reject) =>
          fs.fstat(handle.fd, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
          }),
        );
      await stat();
      stream.end();
      await until(async () => {
        const [, error] = await of(stat());
        return !!error;
      });
      const [, error] = await of(stat());
      expect((error as any).code).toBe('EBADF');
    });

    test('does not close file if "autoClose" is false', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const handle = await fs.promises.open('/folder/file', 'a');
      const stream = fs.createWriteStream('', { fd: handle.fd, start: 1, flags: 'a', autoClose: false });
      stream.write(Buffer.from('BC'));
      const stat = async () =>
        await new Promise((resolve, reject) =>
          fs.fstat(handle.fd, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
          }),
        );
      await stat();
      stream.end();
      await tick(200);
      await stat();
    });

    test('can use stream to add to existing file', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stream = fs.createWriteStream('/folder/file', { flags: 'a' });
      stream.write(Buffer.from('A'));
      stream.write(Buffer.from('BC'));
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(3);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'ABCt',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('can use stream to add to existing file at specified offset', async () => {
      const { fs, mfs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      const stream = fs.createWriteStream('/folder/file', { flags: 'a', start: 1 });
      stream.write(Buffer.from('A'));
      stream.write(Buffer.from('B'));
      stream.end();
      await new Promise(resolve => stream.once('close', resolve));
      expect(stream.bytesWritten).toBe(2);
      expect(mfs.__vol.toJSON()).toStrictEqual({
        '/mountpoint/folder/file': 'tABt',
        '/mountpoint/empty-folder': null,
        '/mountpoint/f.html': 'test',
      });
    });

    test('throws if "start" option is not a number', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      try {
        fs.createWriteStream('/folder/file', { flags: 'a', start: '1' as any });
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe('"start" option must be a Number');
      }
    });

    test('throws if "start" option is negative', async () => {
      const { fs } = setup({ folder: { file: 'test' }, 'empty-folder': null, 'f.html': 'test' });
      try {
        fs.createWriteStream('/folder/file', { flags: 'a', start: -1 });
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe('"start" must be >= zero');
      }
    });
  });
});
