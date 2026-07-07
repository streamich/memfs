import { fsa, FileSystemChangeRecord, IFileSystemChangeRecord } from '..';
import { onlyOnNode20 } from './util';

onlyOnNode20('CoreFileSystemObserver', () => {
  describe('.observe()', () => {
    test('rejects with NotFoundError when the entry no longer exists', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      await dir.removeEntry('file.txt');
      await expect(observer.observe(file)).rejects.toThrow('A requested file or directory could not be found');
    });

    test('rejects with TypeError for an object which is not a handle', async () => {
      const { FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      await expect(observer.observe({} as any)).rejects.toThrow(TypeError);
    });

    test('accepts file, directory, and sync access handles', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite', syncHandleAllowed: true });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const sync = await file.createSyncAccessHandle!();
      await observer.observe(file);
      await observer.observe(subdir, { recursive: true });
      await observer.observe(sync);
      expect((observer as any)._observations.size).toBe(3);
      observer.disconnect();
      await sync.close();
    });

    test('can observe the root directory handle', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      await observer.observe(dir);
      expect((observer as any)._observations.size).toBe(1);
      observer.disconnect();
    });

    test('re-observing the same handle replaces the previous observation', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      const first = (observer as any)._observations.get(file);
      await observer.observe(file);
      const second = (observer as any)._observations.get(file);
      expect((observer as any)._observations.size).toBe(1);
      expect(first.closed).toBe(true);
      expect(second.closed).toBe(false);
      observer.disconnect();
    });

    test('keeps the existing observation when re-observing fails', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const file = await subdir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      core.chmod('/subdir', 0);
      await expect(observer.observe(file)).rejects.toThrow('Permission not granted');
      const watcher = (observer as any)._observations.get(file);
      expect(watcher.closed).toBe(false);
      observer.disconnect();
    });
  });

  describe('.unobserve()', () => {
    test('closes and drops the observation of the given handle', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      const watcher = (observer as any)._observations.get(file);
      observer.unobserve(file);
      expect(watcher.closed).toBe(true);
      expect((observer as any)._observations.size).toBe(0);
    });

    test('is a no-op for a handle which is not observed', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      expect(() => observer.unobserve(file)).not.toThrow();
    });

    test('does not affect other observations', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(file);
      await observer.observe(subdir);
      observer.unobserve(file);
      const watcher = (observer as any)._observations.get(subdir);
      expect(watcher.closed).toBe(false);
      expect((observer as any)._observations.size).toBe(1);
      observer.disconnect();
    });
  });

  describe('.disconnect()', () => {
    test('closes all observations and is idempotent', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(file);
      await observer.observe(subdir);
      const watchers = [...(observer as any)._observations.values()];
      observer.disconnect();
      for (const watcher of watchers) expect(watcher.closed).toBe(true);
      expect((observer as any)._observations.size).toBe(0);
      expect(() => observer.disconnect()).not.toThrow();
    });

    test('allows observing again after disconnect', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const observer = new FileSystemObserver(() => {});
      const file = await dir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      observer.disconnect();
      await observer.observe(file);
      expect((observer as any)._observations.size).toBe(1);
      observer.disconnect();
    });
  });

  describe('batching', () => {
    const flush = () => new Promise(resolve => setImmediate(resolve));

    test('delivers all records of one synchronous batch of changes in a single callback invocation', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      core.mkdir('/subdir/a', 0o755);
      core.mkdir('/subdir/b', 0o755);
      core.mkdir('/subdir/c', 0o755);
      expect(calls.length).toBe(0);
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0].length).toBe(3);
      observer.disconnect();
    });

    test('delivers records of separate ticks in separate callback invocations', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      core.mkdir('/subdir/a', 0o755);
      await flush();
      core.mkdir('/subdir/b', 0o755);
      await flush();
      expect(calls.length).toBe(2);
      expect(calls[0].length).toBe(1);
      expect(calls[1].length).toBe(1);
      observer.disconnect();
    });

    test('batches records of all observations of one observer into one callback', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir1 = await dir.getDirectoryHandle('subdir1', { create: true });
      const subdir2 = await dir.getDirectoryHandle('subdir2', { create: true });
      await observer.observe(subdir1);
      await observer.observe(subdir2);
      core.mkdir('/subdir1/a', 0o755);
      core.mkdir('/subdir2/b', 0o755);
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0].length).toBe(2);
      expect(calls[0][0].root).toBe(subdir1);
      expect(calls[0][1].root).toBe(subdir2);
      observer.disconnect();
    });

    test('passes the observer instance to the callback', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      let seen: unknown;
      const observer = new FileSystemObserver((_records, instance) => (seen = instance));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      core.mkdir('/subdir/a', 0o755);
      await flush();
      expect(seen).toBe(observer);
      observer.disconnect();
    });

    test('emits nothing for changes after unobserve()', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      observer.unobserve(subdir);
      core.mkdir('/subdir/a', 0o755);
      await flush();
      expect(calls.length).toBe(0);
    });
  });

  describe('terminal events', () => {
    const flush = () => new Promise(resolve => setImmediate(resolve));

    test('reports "errored" when the watched entry is deleted and drops the observation', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const file = await dir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      await dir.removeEntry('file.txt');
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([
        { type: 'errored', changedHandle: null, relativePathComponents: [], relativePathMovedFrom: null },
      ]);
      expect(calls[0][0].root).toBe(file);
      expect((observer as any)._observations.size).toBe(0);
    });

    test('emits nothing further for an errored observation, even when the entry reappears', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const file = await dir.getFileHandle('file.txt', { create: true });
      await observer.observe(file);
      await dir.removeEntry('file.txt');
      await flush();
      expect(calls.length).toBe(1);
      await dir.getFileHandle('file.txt', { create: true });
      core.chmod('/file.txt', 0o600);
      await flush();
      expect(calls.length).toBe(1);
    });

    test('deleting a watched directory reports its children first, then errors', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await subdir.getFileHandle('file.txt', { create: true });
      await observer.observe(subdir);
      await dir.removeEntry('subdir', { recursive: true });
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([
        { type: 'disappeared', changedHandle: null, relativePathComponents: ['file.txt'] },
        { type: 'errored', changedHandle: null, relativePathComponents: [] },
      ]);
      expect((observer as any)._observations.size).toBe(0);
    });

    test('other observations continue after one errors', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const file = await dir.getFileHandle('file.txt', { create: true });
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(file);
      await observer.observe(subdir);
      await dir.removeEntry('file.txt');
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([{ type: 'errored' }]);
      core.mkdir('/subdir/a', 0o755);
      await flush();
      expect(calls.length).toBe(2);
      expect(calls[1]).toMatchObject([{ type: 'appeared', relativePathComponents: ['a'] }]);
      expect((observer as any)._observations.size).toBe(1);
      observer.disconnect();
    });

    test('disconnect() drops pending records', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      core.mkdir('/subdir/a', 0o755);
      observer.disconnect();
      await flush();
      expect(calls.length).toBe(0);
    });
  });

  describe('sync access handles', () => {
    const flush = () => new Promise(resolve => setImmediate(resolve));

    test('write through an observed sync access handle produces a "modified" record', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite', syncHandleAllowed: true });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const file = await dir.getFileHandle('file.txt', { create: true });
      const sync = await file.createSyncAccessHandle!();
      await observer.observe(sync);
      await sync.write(new TextEncoder().encode('abc'));
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([{ type: 'modified', relativePathComponents: [], relativePathMovedFrom: null }]);
      expect(calls[0][0].root).toBe(sync);
      const changed = calls[0][0].changedHandle as any;
      expect(changed.kind).toBe('file');
      expect(changed.isSameEntry(file as any)).toBe(true);
      observer.disconnect();
      await sync.close();
    });
  });

  describe('change records', () => {
    const flush = () => new Promise(resolve => setImmediate(resolve));

    test('file creation is reported as "appeared" with a file changedHandle', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      const file = await subdir.getFileHandle('file.txt', { create: true });
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toBeInstanceOf(FileSystemChangeRecord);
      expect(record).toMatchObject({
        type: 'appeared',
        relativePathComponents: ['file.txt'],
        relativePathMovedFrom: null,
      });
      expect(record.root).toBe(subdir);
      const changed = record.changedHandle as any;
      expect(changed.kind).toBe('file');
      expect(changed.isSameEntry(file as any)).toBe(true);
      observer.disconnect();
    });

    test('directory creation is reported as "appeared" with a directory changedHandle', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await observer.observe(subdir);
      const nested = await subdir.getDirectoryHandle('nested', { create: true });
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toMatchObject({ type: 'appeared', relativePathComponents: ['nested'] });
      const changed = record.changedHandle as any;
      expect(changed.kind).toBe('directory');
      expect(changed.isSameEntry(nested as any)).toBe(true);
      observer.disconnect();
    });

    test('file deletion is reported as "disappeared" with a null changedHandle', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await subdir.getFileHandle('file.txt', { create: true });
      await observer.observe(subdir);
      await subdir.removeEntry('file.txt');
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([
        { type: 'disappeared', changedHandle: null, relativePathComponents: ['file.txt'], relativePathMovedFrom: null },
      ]);
      observer.disconnect();
    });

    test('content writes are reported as "modified"', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const file = await subdir.getFileHandle('file.txt', { create: true });
      await observer.observe(subdir);
      const writable = await file.createWritable();
      await writable.write('hello');
      await writable.close();
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toMatchObject({ type: 'modified', relativePathComponents: ['file.txt'] });
      expect((record.changedHandle as any).isSameEntry(file as any)).toBe(true);
      observer.disconnect();
    });

    test('metadata changes are reported as "modified"', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await subdir.getFileHandle('file.txt', { create: true });
      await observer.observe(subdir);
      core.chmod('/subdir/file.txt', 0o600);
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([{ type: 'modified', relativePathComponents: ['file.txt'] }]);
      observer.disconnect();
    });

    test('renames within scope are reported as "moved" with both paths', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      await subdir.getFileHandle('a.txt', { create: true });
      await observer.observe(subdir);
      core.rename('/subdir/a.txt', '/subdir/b.txt');
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toMatchObject({
        type: 'moved',
        relativePathComponents: ['b.txt'],
        relativePathMovedFrom: ['a.txt'],
      });
      const renamed = await subdir.getFileHandle('b.txt');
      expect((record.changedHandle as any).isSameEntry(renamed as any)).toBe(true);
      observer.disconnect();
    });

    test('moves out of scope are reported as "disappeared"', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const watched = await dir.getDirectoryHandle('watched', { create: true });
      await dir.getDirectoryHandle('other', { create: true });
      await watched.getFileHandle('file.txt', { create: true });
      await observer.observe(watched);
      core.rename('/watched/file.txt', '/other/file.txt');
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([
        { type: 'disappeared', changedHandle: null, relativePathComponents: ['file.txt'], relativePathMovedFrom: null },
      ]);
      observer.disconnect();
    });

    test('moves into scope are reported as "appeared"', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const watched = await dir.getDirectoryHandle('watched', { create: true });
      const other = await dir.getDirectoryHandle('other', { create: true });
      await other.getFileHandle('file.txt', { create: true });
      await observer.observe(watched);
      core.rename('/other/file.txt', '/watched/file.txt');
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toMatchObject({
        type: 'appeared',
        relativePathComponents: ['file.txt'],
        relativePathMovedFrom: null,
      });
      const moved = await watched.getFileHandle('file.txt');
      expect((record.changedHandle as any).isSameEntry(moved as any)).toBe(true);
      observer.disconnect();
    });

    test('non-recursive observations ignore changes in nested directories', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const nested = await subdir.getDirectoryHandle('nested', { create: true });
      await observer.observe(subdir);
      await nested.getFileHandle('deep.txt', { create: true });
      await flush();
      expect(calls.length).toBe(0);
      observer.disconnect();
    });

    test('recursive observations report nested changes with full relative paths', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const nested = await subdir.getDirectoryHandle('nested', { create: true });
      await observer.observe(subdir, { recursive: true });
      const file = await nested.getFileHandle('deep.txt', { create: true });
      await flush();
      expect(calls.length).toBe(1);
      const record = calls[0][0];
      expect(record).toMatchObject({ type: 'appeared', relativePathComponents: ['nested', 'deep.txt'] });
      expect((record.changedHandle as any).isSameEntry(file as any)).toBe(true);
      observer.disconnect();
    });

    test('recursive moves across subdirectories carry full relative paths', async () => {
      const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      const calls: IFileSystemChangeRecord[][] = [];
      const observer = new FileSystemObserver(records => calls.push(records));
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const n1 = await subdir.getDirectoryHandle('n1', { create: true });
      await subdir.getDirectoryHandle('n2', { create: true });
      await n1.getFileHandle('a.txt', { create: true });
      await observer.observe(subdir, { recursive: true });
      core.rename('/subdir/n1/a.txt', '/subdir/n2/b.txt');
      await flush();
      expect(calls.length).toBe(1);
      expect(calls[0]).toMatchObject([
        { type: 'moved', relativePathComponents: ['n2', 'b.txt'], relativePathMovedFrom: ['n1', 'a.txt'] },
      ]);
      observer.disconnect();
    });
  });

  test('can listen to file writes', async () => {
    const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
    const changes: IFileSystemChangeRecord[] = [];
    const observer = new FileSystemObserver(records => {
      changes.push(...records);
    });
    const file = await dir.getFileHandle('file.txt', { create: true });
    await observer.observe(file);
    expect(changes).toEqual([]);
    const writable = await file.createWritable();
    await writable.write('Hello, world!');
    await writable.close();
    expect(changes.length).toBe(1);
    expect(changes).toMatchObject([
      {
        type: 'modified',
      },
    ]);
    expect((changes[0].changedHandle as any).isSameEntry(file as any)).toBe(true);
    observer.disconnect();
  });
});
