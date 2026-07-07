import { fsa, IFileSystemChangeRecord } from '..';
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

  test.skip('can listen to file writes', async () => {
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
    observer.disconnect();
  });
});
