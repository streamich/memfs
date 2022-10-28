import { Volume } from '../volume';

describe('Promises API', () => {
  describe('FileHandle', () => {
    it('API should have a FileHandle property', () => {
      const vol = new Volume();
      const { promises } = vol;
      expect(typeof promises.FileHandle).toBe('function');
    });
    describe('fd', () => {
      it('FileHandle should have a fd property', async () => {
        const vol = new Volume();
        const { promises } = vol;
        vol.fromJSON({
          '/foo': 'bar',
        });
        const fileHandle = await promises.open('/foo', 'r');
        expect(typeof fileHandle.fd).toEqual('number');
        await fileHandle.close();
      });
    });
    describe('appendFile(data[, options])', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Append data to an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.appendFile('baz');
        expect(vol.readFileSync('/foo').toString()).toEqual('barbaz');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.close();
        return expect(fileHandle.appendFile('/foo', 'baz')).rejects.toBeInstanceOf(Error);
      });
    });
    describe('chmod(mode)', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Change mode of existing file', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.chmod(0o444);
        expect(vol.statSync('/foo').mode & 0o777).toEqual(0o444);
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.close();
        return expect(fileHandle.chmod(0o666)).rejects.toBeInstanceOf(Error);
      });
    });
    describe('chown(uid, gid)', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      const { uid, gid } = vol.statSync('/foo');
      it('Change uid and gid of existing file', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.chown(uid + 1, gid + 1);
        const stats = vol.statSync('/foo');
        expect(stats.uid).toEqual(uid + 1);
        expect(stats.gid).toEqual(gid + 1);
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'a');
        await fileHandle.close();
        return expect(fileHandle.chown(uid + 2, gid + 2)).rejects.toBeInstanceOf(Error);
      });
    });
    // close(): covered by all other tests
    describe('datasync()', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Synchronize data with an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.datasync();
        expect(vol.readFileSync('/foo').toString()).toEqual('bar');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.datasync()).rejects.toBeInstanceOf(Error);
      });
    });
    describe('read(buffer, offset, length, position)', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Read data from an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        const buff = Buffer.from('foo');
        const { bytesRead, buffer } = await fileHandle.read(buff, 0, 42, 0);
        expect(bytesRead).toEqual(3);
        expect(buffer).toBe(buff);
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.read(Buffer.from('foo'), 0, 42, 0)).rejects.toBeInstanceOf(Error);
      });
    });
    describe('readFile([options])', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Read data from an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        expect((await fileHandle.readFile()).toString()).toEqual('bar');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.readFile()).rejects.toBeInstanceOf(Error);
      });
    });
    describe('stat()', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Return stats of an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        expect((await fileHandle.stat()).isFile()).toEqual(true);
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.stat()).rejects.toBeInstanceOf(Error);
      });
    });
    describe('.stat(path, options)', () => {
      const { promises: vol } = new Volume();

      it('Does not reject when entry does not exist if throwIfNoEntry is false', async () => {
        const stat = await vol.stat('/no', { throwIfNoEntry: false });
        expect(stat).toBeUndefined();
      });
      it('Rejects when entry does not exist if throwIfNoEntry is true', async () => {
        await expect(vol.stat('/foo', { throwIfNoEntry: true })).rejects.toBeInstanceOf(Error);
      });
      it('Rejects when entry does not exist if throwIfNoEntry is not specified', async () => {
        await expect(vol.stat('/foo')).rejects.toBeInstanceOf(Error);
      });
      it('Rejects when entry does not exist if throwIfNoEntry is explicitly undefined', async () => {
        await expect(vol.stat('/foo', { throwIfNoEntry: undefined })).rejects.toBeInstanceOf(Error);
      });
    });
    describe('.lstat(path, options)', () => {
      const { promises: vol } = new Volume();

      it('Does not throw when entry does not exist if throwIfNoEntry is false', async () => {
        const stat = await vol.lstat('/foo', { throwIfNoEntry: false });
        expect(stat).toBeUndefined();
      });
      it('Rejects when entry does not exist if throwIfNoEntry is true', async () => {
        await expect(vol.lstat('/foo', { throwIfNoEntry: true })).rejects.toBeInstanceOf(Error);
      });
      it('Rejects when entry does not exist if throwIfNoEntry is not specified', async () => {
        await expect(vol.lstat('/foo')).rejects.toBeInstanceOf(Error);
      });
      it('Rejects when entry does not exist if throwIfNoEntry is explicitly undefined', async () => {
        await expect(vol.lstat('/foo', { throwIfNoEntry: undefined })).rejects.toBeInstanceOf(Error);
      });
    });
    describe('truncate([len])', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': '0123456789',
      });
      it('Truncate an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.truncate(5);
        expect(vol.readFileSync('/foo').toString()).toEqual('01234');
        await fileHandle.truncate(7);
        expect(vol.readFileSync('/foo').toString()).toEqual('01234\0\0');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.truncate(5)).rejects.toBeInstanceOf(Error);
      });
    });
    describe('utimes(atime, mtime)', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': '0123456789',
      });
      const fttDeparture = new Date(1985, 9, 26, 1, 21); // ftt stands for "first time travel" :-)
      const fttArrival = new Date(fttDeparture.getTime() + 60000);
      it('Changes times of an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.utimes(fttArrival, fttDeparture);
        const stats = vol.statSync('/foo');
        expect(stats.atime).toEqual(new Date(fttArrival as any));
        expect(stats.mtime).toEqual(new Date(fttDeparture as any));
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'r+');
        await fileHandle.close();
        return expect(fileHandle.utimes(fttArrival, fttDeparture)).rejects.toBeInstanceOf(Error);
      });
    });
    describe('write(buffer[, offset[, length[, position]]])', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Write data to an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'w');
        await fileHandle.write(Buffer.from('foo'));
        expect(vol.readFileSync('/foo').toString()).toEqual('foo');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'w');
        await fileHandle.close();
        return expect(fileHandle.write(Buffer.from('foo'))).rejects.toBeInstanceOf(Error);
      });
    });
    describe('writeFile(data[, options])', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      it('Write data to an existing file', async () => {
        const fileHandle = await promises.open('/foo', 'w');
        await fileHandle.writeFile('foo');
        expect(vol.readFileSync('/foo').toString()).toEqual('foo');
        await fileHandle.close();
      });
      it('Reject when the file handle was closed', async () => {
        const fileHandle = await promises.open('/foo', 'w');
        await fileHandle.close();
        return expect(fileHandle.writeFile('foo')).rejects.toBeInstanceOf(Error);
      });
    });
  });
  describe('access(path[, mode])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Resolve when file exists', () => {
      return expect(promises.access('/foo')).resolves.toBeUndefined();
    });
    it('Reject when file does not exist', () => {
      return expect(promises.access('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('appendFile(path, data[, options])', () => {
    it('Append data to existing file', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      await promises.appendFile('/foo', 'baz');
      expect(vol.readFileSync('/foo').toString()).toEqual('barbaz');
    });
    it('Append data to existing file using FileHandle', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      const fileHandle = await promises.open('/foo', 'a');
      await promises.appendFile(fileHandle, 'baz');
      await fileHandle.close();
      expect(vol.readFileSync('/foo').toString()).toEqual('barbaz');
    });
    it('Reject when trying to write on a directory', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': null,
      });
      return expect(promises.appendFile('/foo', 'bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('chmod(path, mode)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Change mode of existing file', async () => {
      await promises.chmod('/foo', 0o444);
      expect(vol.statSync('/foo').mode & 0o777).toEqual(0o444);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.chmod('/bar', 0o444)).rejects.toBeInstanceOf(Error);
    });
  });
  describe('chown(path, uid, gid)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Change uid and gid of existing file', async () => {
      const { uid, gid } = vol.statSync('/foo');
      await promises.chown('/foo', uid + 1, gid + 1);
      const stats = vol.statSync('/foo');
      expect(stats.uid).toEqual(uid + 1);
      expect(stats.gid).toEqual(gid + 1);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.chown('/bar', 0, 0)).rejects.toBeInstanceOf(Error);
    });
  });
  describe('copyFile(src, dest[, flags])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Copy existing file', async () => {
      await promises.copyFile('/foo', '/bar');
      expect(vol.readFileSync('/bar').toString()).toEqual('bar');
    });
    it('Reject when file does not exist', () => {
      return expect(promises.copyFile('/baz', '/qux')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('lchmod(path, mode)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    vol.symlinkSync('/foo', '/bar');
    it('Change mode of existing file', async () => {
      await promises.lchmod('/bar', 0o444);
      expect(vol.statSync('/foo').mode & 0o777).toEqual(0o666);
      expect(vol.lstatSync('/bar').mode & 0o777).toEqual(0o444);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.lchmod('/baz', 0o444)).rejects.toBeInstanceOf(Error);
    });
  });
  describe('lchown(path, uid, gid)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    vol.symlinkSync('/foo', '/bar');
    it('Change uid and gid of existing file', async () => {
      const fooStatsBefore = vol.statSync('/foo');
      const { uid, gid } = vol.statSync('/bar');
      await promises.lchown('/bar', uid + 1, gid + 1);
      const fooStatsAfter = vol.statSync('/foo');
      expect(fooStatsAfter.uid).toEqual(fooStatsBefore.uid);
      expect(fooStatsAfter.gid).toEqual(fooStatsBefore.gid);
      const stats = vol.lstatSync('/bar');
      expect(stats.uid).toEqual(uid + 1);
      expect(stats.gid).toEqual(gid + 1);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.lchown('/baz', 0, 0)).rejects.toBeInstanceOf(Error);
    });
  });
  describe('link(existingPath, newPath)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Create hard link on existing file', async () => {
      await promises.link('/foo', '/bar');
      expect(vol.existsSync('/bar')).toEqual(true);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.link('/baz', '/qux')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('lstat(path)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    vol.symlinkSync('/foo', '/bar');
    it('Get stats on an existing symbolic link', async () => {
      const stats = await promises.lstat('/bar');
      expect(stats.isSymbolicLink()).toEqual(true);
    });
    it('Reject when symbolic link does not exist', () => {
      return expect(promises.lstat('/baz')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('mkdir(path[, options])', () => {
    const vol = new Volume();
    const { promises } = vol;
    it('Creates a directory', async () => {
      await promises.mkdir('/foo');
      expect(vol.statSync('/foo').isDirectory()).toEqual(true);
    });
    it('Reject when a file already exists', () => {
      vol.writeFileSync('/bar', 'bar');
      return expect(promises.mkdir('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('mkdtemp(prefix[, options])', () => {
    const vol = new Volume();
    const { promises } = vol;
    it('Creates a temporary directory', async () => {
      const tmp = await promises.mkdtemp('/foo');
      expect(vol.statSync(tmp).isDirectory()).toEqual(true);
    });
    it('Reject when parent directory does not exist', () => {
      return expect(promises.mkdtemp('/foo/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('open(path, flags[, mode])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Open an existing file', async () => {
      expect(await promises.open('/foo', 'r')).toBeInstanceOf(promises.FileHandle);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.open('/bar', 'r')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('readdir(path[, options])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': null,
      '/foo/bar': 'bar',
      '/foo/baz': 'baz',
    });
    it('Read an existing directory', async () => {
      expect(await promises.readdir('/foo')).toEqual(['bar', 'baz']);
    });
    it('Reject when directory does not exist', () => {
      return expect(promises.readdir('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('readFile(id[, options])', () => {
    it('Read existing file', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      expect((await promises.readFile('/foo')).toString()).toEqual('bar');
    });
    it('Read existing file using FileHandle', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      const fileHandle = await promises.open('/foo', 'r');
      expect((await promises.readFile(fileHandle)).toString()).toEqual('bar');
      await fileHandle.close();
    });
    it('Reject when file does not exist', () => {
      const vol = new Volume();
      const { promises } = vol;
      return expect(promises.readFile('/foo')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('readlink(path[, options])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.symlinkSync('/foo', '/bar');
    it('Read an existing symbolic link', async () => {
      expect((await promises.readlink('/bar')).toString()).toEqual('/foo');
    });
    it('Reject when symbolic link does not exist', () => {
      return expect(promises.readlink('/foo')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('realpath(path[, options])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': null,
      '/foo/bar': null,
      '/foo/baz': 'baz',
    });
    vol.symlinkSync('/foo/baz', '/foo/qux');
    it('Return real path of existing file', async () => {
      expect((await promises.realpath('/foo/bar/../qux')).toString()).toEqual('/foo/baz');
    });
    it('Reject when file does not exist', () => {
      return expect(promises.realpath('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('rename(oldPath, newPath)', () => {
    it('Rename existing file', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      await promises.rename('/foo', '/bar');
      expect(vol.readFileSync('/bar').toString()).toEqual('bar');
    });
    it('Reject when file does not exist', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      return expect(promises.rename('/bar', '/baz')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('rmdir(path)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': null,
    });
    it('Remove an existing directory', async () => {
      await promises.rmdir('/foo');
      expect(vol.existsSync('/foo')).toEqual(false);
    });
    it('Reject when directory does not exist', () => {
      return expect(promises.rmdir('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('stat(path)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': null,
    });
    it('Return stats of an existing directory', async () => {
      expect((await promises.stat('/foo')).isDirectory()).toEqual(true);
    });
    it('Reject when directory does not exist', () => {
      return expect(promises.stat('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('symlink(target, path[, type])', () => {
    it('Create symbolic link', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      await promises.symlink('/foo', '/bar');
      expect(vol.lstatSync('/bar').isSymbolicLink()).toEqual(true);
    });
    it('Reject when file already exists', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': 'bar',
      });
      return expect(promises.symlink('/bar', '/foo')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('truncate(path[, len])', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': '0123456789',
    });
    it('Truncate an existing file', async () => {
      await promises.truncate('/foo', 5);
      expect(vol.readFileSync('/foo').toString()).toEqual('01234');
      await promises.truncate('/foo', 7);
      expect(vol.readFileSync('/foo').toString()).toEqual('01234\0\0');
    });
    it('Reject when file does not exist', () => {
      return expect(promises.truncate('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('unlink(path)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    it('Unlink an existing file', async () => {
      await promises.unlink('/foo');
      expect(vol.existsSync('/foo')).toEqual(false);
    });
    it('Reject when file does not exist', () => {
      return expect(promises.unlink('/bar')).rejects.toBeInstanceOf(Error);
    });
  });
  describe('utimes(path, atime, mtime)', () => {
    const vol = new Volume();
    const { promises } = vol;
    vol.fromJSON({
      '/foo': 'bar',
    });
    const fttDeparture = new Date(1985, 9, 26, 1, 21);
    const fttArrival = new Date(fttDeparture.getTime() + 60000);
    it('Changes times of an existing file', async () => {
      await promises.utimes('/foo', fttArrival, fttDeparture);
      const stats = vol.statSync('/foo');
      expect(stats.atime).toEqual(new Date(fttArrival as any));
      expect(stats.mtime).toEqual(new Date(fttDeparture as any));
    });
    it('Reject when file does not exist', () => {
      return expect(promises.utimes('/bar', fttArrival, fttDeparture)).rejects.toBeInstanceOf(Error);
    });
  });
  describe('writeFile(id, data[, options])', () => {
    it('Write data to an existing file', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': '',
      });
      await promises.writeFile('/foo', 'bar');
      expect(vol.readFileSync('/foo').toString()).toEqual('bar');
    });
    it('Write data to existing file using FileHandle', async () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': '',
      });
      const fileHandle = await promises.open('/foo', 'w');
      await promises.writeFile(fileHandle, 'bar');
      expect(vol.readFileSync('/foo').toString()).toEqual('bar');
      await fileHandle.close();
    });
    it('Reject when trying to write on a directory', () => {
      const vol = new Volume();
      const { promises } = vol;
      vol.fromJSON({
        '/foo': null,
      });
      return expect(promises.writeFile('/foo', 'bar')).rejects.toBeInstanceOf(Error);
    });
  });
});
