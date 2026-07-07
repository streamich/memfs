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
});
