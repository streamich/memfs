import { DirectoryJSON, memfs } from 'memfs';
import { NodeFileSystemDirectoryHandle } from '../NodeFileSystemDirectoryHandle';
import { NodeFileSystemObserver } from '../NodeFileSystemObserver';
import { onlyOnNode20 } from './util';
import type { IFileSystemChangeRecord } from '@jsonjoy.com/fs-fsa';

const tick = (ms: number = 1) => new Promise(r => setTimeout(r, ms));

const until = async (check: () => boolean | Promise<boolean>, pollInterval: number = 1) => {
  do {
    if (await check()) return;
    await tick(pollInterval);
  } while (true);
};

const setup = (json: DirectoryJSON = {}) => {
  const { fs } = memfs(json, '/');
  const dir = new NodeFileSystemDirectoryHandle(fs as any, '/', { mode: 'readwrite', syncHandleAllowed: true });
  const records: IFileSystemChangeRecord[] = [];
  const observer = new NodeFileSystemObserver(fs as any, batch => records.push(...batch));
  return { fs, dir, observer, records };
};

onlyOnNode20('NodeFileSystemObserver', () => {
  test('rejects with NotFoundError when the entry does not exist', async () => {
    const { dir, observer } = setup({ '/file.txt': 'x' });
    const file = await dir.getFileHandle('file.txt');
    const fs = (dir as any).fs;
    fs.unlinkSync('/file.txt');
    await expect(observer.observe(file)).rejects.toThrow('A requested file or directory could not be found');
  });

  test('rejects with NotAllowedError when the entry is not accessible', async () => {
    const { fs, dir, observer } = setup({ '/locked/file.txt': 'x' });
    const locked = await dir.getDirectoryHandle('locked');
    const file = await locked.getFileHandle('file.txt');
    fs.chmodSync('/locked', 0);
    await expect(observer.observe(file)).rejects.toThrow('Permission not granted');
  });

  test('rejects with TypeError for an object which is not a handle', async () => {
    const { observer } = setup();
    await expect(observer.observe({} as any)).rejects.toThrow(TypeError);
    await expect(observer.observe({ __path: '/' } as any)).rejects.toThrow(TypeError);
  });

  test('accepts a sync access handle and reports its self events', async () => {
    const { fs, dir, observer, records } = setup({ '/file.txt': '' });
    const file = await dir.getFileHandle('file.txt');
    const sync = await file.createSyncAccessHandle!();
    await observer.observe(sync);
    await sync.write(new TextEncoder().encode('abc'));
    await until(() => records.some(r => r.type === 'modified'));
    const record = records.find(r => r.type === 'modified')!;
    expect(record.relativePathComponents).toEqual([]);
    expect(record.root).toBe(sync);
    observer.disconnect();
    await sync.close();
  });

  test('reports "appeared" when a file is created in an observed directory', async () => {
    const { fs, dir, observer, records } = setup();
    await observer.observe(dir);
    fs.writeFileSync('/file.txt', 'hello');
    await until(() => records.some(r => r.type === 'appeared'));
    const record = records.find(r => r.type === 'appeared')!;
    expect(record.relativePathComponents).toEqual(['file.txt']);
    expect(record.relativePathMovedFrom).toBe(null);
    expect(record.root).toBe(dir);
    expect((record.changedHandle as any).kind).toBe('file');
    expect((record.changedHandle as any).__path).toBe('/file.txt');
    observer.disconnect();
  });

  test('reports "disappeared" with a null changedHandle when a file is deleted', async () => {
    const { fs, dir, observer, records } = setup({ '/file.txt': 'x' });
    await observer.observe(dir);
    fs.unlinkSync('/file.txt');
    await until(() => records.some(r => r.type === 'disappeared'));
    const record = records.find(r => r.type === 'disappeared')!;
    expect(record.relativePathComponents).toEqual(['file.txt']);
    expect(record.changedHandle).toBe(null);
    observer.disconnect();
  });

  test('reports "modified" when a file changes', async () => {
    const { fs, dir, observer, records } = setup({ '/file.txt': '' });
    await observer.observe(dir);
    fs.appendFileSync('/file.txt', 'more');
    await until(() => records.some(r => r.type === 'modified'));
    const record = records.find(r => r.type === 'modified')!;
    expect(record.relativePathComponents).toEqual(['file.txt']);
    expect((record.changedHandle as any).kind).toBe('file');
    observer.disconnect();
  });

  test('reports a rename as "disappeared" plus "appeared", never "moved"', async () => {
    const { fs, dir, observer, records } = setup({ '/a.txt': 'x' });
    await observer.observe(dir);
    fs.renameSync('/a.txt', '/b.txt');
    await until(() => records.length >= 2);
    const types = records.map(r => r.type).sort();
    expect(types).toEqual(['appeared', 'disappeared']);
    expect(records.some(r => r.type === 'moved')).toBe(false);
    const appeared = records.find(r => r.type === 'appeared')!;
    const disappeared = records.find(r => r.type === 'disappeared')!;
    expect(appeared.relativePathComponents).toEqual(['b.txt']);
    expect(disappeared.relativePathComponents).toEqual(['a.txt']);
    observer.disconnect();
  });

  test('recursive observations report nested paths', async () => {
    const { fs, dir, observer, records } = setup({ '/sub/.keep': '' });
    await observer.observe(dir, { recursive: true });
    fs.writeFileSync('/sub/deep.txt', 'x');
    await until(() => records.some(r => r.type === 'appeared'));
    const record = records.find(r => r.type === 'appeared')!;
    expect(record.relativePathComponents).toEqual(['sub', 'deep.txt']);
    observer.disconnect();
  });

  test('non-recursive observations ignore nested changes', async () => {
    const { fs, dir, observer, records } = setup({ '/sub/.keep': '' });
    await observer.observe(dir);
    fs.writeFileSync('/sub/deep.txt', 'x');
    await tick(10);
    expect(records.filter(r => r.relativePathComponents.length > 1)).toEqual([]);
    observer.disconnect();
  });

  test('observing a file reports self events with empty path components', async () => {
    const { fs, dir, observer, records } = setup({ '/file.txt': '' });
    const file = await dir.getFileHandle('file.txt');
    await observer.observe(file);
    fs.appendFileSync('/file.txt', 'more');
    await until(() => records.some(r => r.type === 'modified'));
    const record = records.find(r => r.type === 'modified')!;
    expect(record.relativePathComponents).toEqual([]);
    expect(record.root).toBe(file);
    observer.disconnect();
  });

  test('emits a terminal "errored" record when the backend watcher errors', async () => {
    const { dir, observer, records } = setup();
    await observer.observe(dir);
    const watcher = (observer as any)._observations.get(dir);
    watcher.emit('error', new Error('backend died'));
    await until(() => records.some(r => r.type === 'errored'));
    const record = records.find(r => r.type === 'errored')!;
    expect(record.changedHandle).toBe(null);
    expect(record.relativePathComponents).toEqual([]);
    expect((observer as any)._observations.size).toBe(0);
  });

  test('ignores backend watcher errors of an observation which was already stopped', async () => {
    const { dir, observer, records } = setup();
    await observer.observe(dir);
    const watcher = (observer as any)._observations.get(dir);
    observer.unobserve(dir);
    watcher.emit('error', new Error('late backend error'));
    await tick(5);
    expect(records).toEqual([]);
  });

  test('ignores backend watcher errors of a replaced observation', async () => {
    const { dir, observer, records } = setup();
    await observer.observe(dir);
    const first = (observer as any)._observations.get(dir);
    await observer.observe(dir);
    first.emit('error', new Error('late backend error'));
    await tick(5);
    expect(records).toEqual([]);
    expect((observer as any)._observations.size).toBe(1);
    observer.disconnect();
  });

  test('unobserve() stops event delivery', async () => {
    const { fs, dir, observer, records } = setup();
    await observer.observe(dir);
    observer.unobserve(dir);
    fs.writeFileSync('/file.txt', 'x');
    await tick(10);
    expect(records).toEqual([]);
  });

  test('disconnect() stops all observations', async () => {
    const { fs, dir, observer, records } = setup({ '/sub/.keep': '' });
    const sub = await dir.getDirectoryHandle('sub');
    await observer.observe(dir);
    await observer.observe(sub);
    observer.disconnect();
    fs.writeFileSync('/file.txt', 'x');
    fs.writeFileSync('/sub/other.txt', 'x');
    await tick(10);
    expect(records).toEqual([]);
    expect((observer as any)._observations.size).toBe(0);
  });
});
