import { fsa } from '@jsonjoy.com/fs-fsa';
import { FsaNodeFs } from '../FsaNodeFs';
import { onlyOnNode20 } from './util';

const tick = (ms: number = 1) => new Promise(r => setTimeout(r, ms));

const until = async (check: () => boolean | Promise<boolean>, pollInterval: number = 1) => {
  do {
    if (await check()) return;
    await tick(pollInterval);
  } while (true);
};

const setup = () => {
  const { core, dir, FileSystemObserver } = fsa({ mode: 'readwrite', syncHandleAllowed: true });
  const fs = new FsaNodeFs(dir, undefined, { FileSystemObserver });
  return { fs, core, dir };
};

onlyOnNode20('FsaNodeFs.watch()', () => {
  test('throws synchronously when no FileSystemObserver is available', () => {
    const { dir } = fsa({ mode: 'readwrite' });
    const fs = new FsaNodeFs(dir);
    expect(() => fs.watch('/')).toThrow('no `FileSystemObserver` is available');
  });

  test('emits "rename" when a file is created in the watched directory', async () => {
    const { fs, dir } = setup();
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await dir.getFileHandle('file.txt', { create: true });
    await until(() => events.length >= 1);
    expect(events).toEqual([['rename', 'file.txt']]);
    watcher.close();
  });

  test('emits "change" when a file is modified', async () => {
    const { fs, dir } = setup();
    const file = await dir.getFileHandle('file.txt', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    await until(() => events.length >= 1);
    expect(events).toEqual([['change', 'file.txt']]);
    watcher.close();
  });

  test('emits "rename" when a file is deleted', async () => {
    const { fs, dir } = setup();
    await dir.getFileHandle('file.txt', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await dir.removeEntry('file.txt');
    await until(() => events.length >= 1);
    expect(events).toEqual([['rename', 'file.txt']]);
    watcher.close();
  });

  test('emits two "rename" events for a move within the watched directory', async () => {
    const { fs, core, dir } = setup();
    await dir.getFileHandle('a.txt', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    core.rename('/a.txt', '/b.txt');
    await until(() => events.length >= 2);
    expect(events).toEqual([
      ['rename', 'a.txt'],
      ['rename', 'b.txt'],
    ]);
    watcher.close();
  });

  test('watching a file emits "change" with its own name on writes', async () => {
    const { fs, dir } = setup();
    const file = await dir.getFileHandle('file.txt', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/file.txt', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    await until(() => events.length >= 1);
    expect(events).toEqual([['change', 'file.txt']]);
    watcher.close();
  });

  test('deleting the watched file emits a terminal "rename"', async () => {
    const { fs, dir } = setup();
    await dir.getFileHandle('file.txt', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/file.txt', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await dir.removeEntry('file.txt');
    await until(() => events.length >= 1);
    expect(events).toEqual([['rename', 'file.txt']]);
    await dir.getFileHandle('file.txt', { create: true });
    await tick(5);
    expect(events.length).toBe(1);
  });

  test('recursive watch reports nested paths joined with the separator', async () => {
    const { fs, dir } = setup();
    const subdir = await dir.getDirectoryHandle('subdir', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', { recursive: true }, (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await subdir.getFileHandle('deep.txt', { create: true });
    await until(() => events.length >= 1);
    expect(events).toEqual([['rename', 'subdir/deep.txt']]);
    watcher.close();
  });

  test('non-recursive watch ignores nested changes', async () => {
    const { fs, dir } = setup();
    const subdir = await dir.getDirectoryHandle('subdir', { create: true });
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await subdir.getFileHandle('deep.txt', { create: true });
    await tick(5);
    expect(events).toEqual([]);
    watcher.close();
  });

  test('supports the "buffer" encoding for filenames', async () => {
    const { fs, dir } = setup();
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', { encoding: 'buffer' }, (eventType, filename) => events.push([eventType, filename]));
    await tick();
    await dir.getFileHandle('file.txt', { create: true });
    await until(() => events.length >= 1);
    expect(Buffer.isBuffer(events[0][1])).toBe(true);
    expect(String(events[0][1])).toBe('file.txt');
    watcher.close();
  });

  test('emits "error" asynchronously when the watched path does not exist', async () => {
    const { fs } = setup();
    const errors: any[] = [];
    const watcher = fs.watch('/missing/file.txt');
    watcher.on('error', error => errors.push(error));
    await until(() => errors.length >= 1);
    expect(errors[0].message).toBe('watch /missing/file.txt ENOENT');
    expect(errors[0].code).toBe('ENOENT');
  });

  test('close() emits "close" and stops event delivery', async () => {
    const { fs, dir } = setup();
    const events: [string, unknown][] = [];
    let closed = 0;
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    watcher.on('close', () => closed++);
    await tick();
    watcher.close();
    watcher.close();
    await dir.getFileHandle('file.txt', { create: true });
    await tick(5);
    expect(events).toEqual([]);
    expect(closed).toBe(1);
  });

  describe('signal option', () => {
    test('aborting the signal closes the watcher and emits "close"', async () => {
      const { fs, dir } = setup();
      const events: unknown[] = [];
      const controller = new AbortController();
      let closed = 0;
      const watcher = fs.watch('/', { signal: controller.signal }, (...args) => events.push(args));
      watcher.on('close', () => closed++);
      await tick();
      controller.abort();
      await until(() => closed >= 1);
      await dir.getFileHandle('file.txt', { create: true });
      await tick(5);
      expect(events).toEqual([]);
    });

    test('returns an already-closed watcher when the signal is pre-aborted', async () => {
      const { fs, dir } = setup();
      const events: unknown[] = [];
      const controller = new AbortController();
      controller.abort();
      let closed = 0;
      const watcher = fs.watch('/', { signal: controller.signal }, (...args) => events.push(args));
      watcher.on('close', () => closed++);
      await until(() => closed >= 1);
      await dir.getFileHandle('file.txt', { create: true });
      await tick(5);
      expect(events).toEqual([]);
    });

    test('aborting after a manual close() does not emit "close" twice', async () => {
      const { fs } = setup();
      const controller = new AbortController();
      let closed = 0;
      const watcher = fs.watch('/', { signal: controller.signal });
      watcher.on('close', () => closed++);
      await tick();
      watcher.close();
      await until(() => closed >= 1);
      controller.abort();
      await tick(5);
      expect(closed).toBe(1);
    });
  });

  describe('throwIfNoEntry option', () => {
    test('emits "error" for a missing path when true', async () => {
      const { fs } = setup();
      const errors: any[] = [];
      const watcher = fs.watch('/missing.txt', { throwIfNoEntry: true });
      watcher.on('error', error => errors.push(error));
      await until(() => errors.length >= 1);
      expect(errors[0].code).toBe('ENOENT');
    });

    test('suppresses the ENOENT "error" when false and leaves an inert watcher', async () => {
      const { fs, dir } = setup();
      const events: unknown[] = [];
      const errors: unknown[] = [];
      let closed = 0;
      const watcher = fs.watch('/missing.txt', { throwIfNoEntry: false }, (...args) => events.push(args));
      watcher.on('error', error => errors.push(error));
      watcher.on('close', () => closed++);
      await tick(5);
      await dir.getFileHandle('missing.txt', { create: true });
      await tick(5);
      watcher.close();
      await tick(5);
      expect(errors).toEqual([]);
      expect(events).toEqual([]);
      expect(closed).toBe(0);
    });

    test('suppresses only ENOENT; other errors are still emitted', async () => {
      const { fs, dir } = setup();
      await dir.getFileHandle('file.txt', { create: true });
      const errors: any[] = [];
      const watcher = fs.watch('/file.txt/sub', { throwIfNoEntry: false });
      watcher.on('error', error => errors.push(error));
      await until(() => errors.length >= 1);
      expect(errors[0].code).toBe('ENOTDIR');
    });

    test('disconnects the never-started observer when the ENOENT is suppressed', async () => {
      const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
      let disconnects = 0;
      class SpyObserver extends FileSystemObserver {
        disconnect(): void {
          disconnects++;
          super.disconnect();
        }
      }
      const fs = new FsaNodeFs(dir, undefined, { FileSystemObserver: SpyObserver });
      fs.watch('/missing.txt', { throwIfNoEntry: false });
      await until(() => disconnects >= 1);
      expect(disconnects).toBe(1);
    });
  });

  describe('ignore option', () => {
    test('filters events by glob string pattern', async () => {
      const { fs, dir } = setup();
      const events: [string, unknown][] = [];
      const watcher = fs.watch('/', { ignore: '*.log' }, (eventType, filename) => events.push([eventType, filename]));
      await tick();
      await dir.getFileHandle('a.log', { create: true });
      await tick(5);
      expect(events).toEqual([]);
      await dir.getFileHandle('a.txt', { create: true });
      await until(() => events.length >= 1);
      expect(events).toEqual([['rename', 'a.txt']]);
      watcher.close();
    });

    test('accepts an array mixing glob, RegExp, and function patterns', async () => {
      const { fs, dir } = setup();
      const events: [string, unknown][] = [];
      const ignore = ['*.log', /^skip/, (filename: string) => filename.endsWith('.tmp')];
      const watcher = fs.watch('/', { ignore }, (eventType, filename) => events.push([eventType, filename]));
      await tick();
      await dir.getFileHandle('a.log', { create: true });
      await dir.getFileHandle('skip.txt', { create: true });
      await dir.getFileHandle('b.tmp', { create: true });
      await tick(5);
      expect(events).toEqual([]);
      await dir.getFileHandle('keep.txt', { create: true });
      await until(() => events.length >= 1);
      expect(events).toEqual([['rename', 'keep.txt']]);
      watcher.close();
    });

    test('matches relative paths in recursive mode', async () => {
      const { fs, dir } = setup();
      const subdir = await dir.getDirectoryHandle('subdir', { create: true });
      const events: [string, unknown][] = [];
      const watcher = fs.watch('/', { recursive: true, ignore: '**/*.tmp' }, (eventType, filename) =>
        events.push([eventType, filename]),
      );
      await tick();
      await subdir.getFileHandle('a.tmp', { create: true });
      await tick(5);
      expect(events).toEqual([]);
      await subdir.getFileHandle('a.txt', { create: true });
      await until(() => events.length >= 1);
      expect(events).toEqual([['rename', 'subdir/a.txt']]);
      watcher.close();
    });

    test('filters each half of a rename independently', async () => {
      const { fs, core, dir } = setup();
      await dir.getFileHandle('a.txt', { create: true });
      const events: [string, unknown][] = [];
      const watcher = fs.watch('/', { ignore: '*.bak' }, (eventType, filename) => events.push([eventType, filename]));
      await tick();
      core.rename('/a.txt', '/a.bak');
      await until(() => events.length >= 1);
      await tick(5);
      expect(events).toEqual([['rename', 'a.txt']]);
      watcher.close();
    });

    test('throws TypeError for an invalid pattern type', () => {
      const { fs } = setup();
      expect(() => fs.watch('/', { ignore: 42 as any })).toThrow(TypeError);
    });
  });
});
