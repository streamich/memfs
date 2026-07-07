import { fsa } from '@jsonjoy.com/fs-fsa';
import { FsaNodeFs } from '../FsaNodeFs';
import { onlyOnNode20 } from './util';
import type * as misc from '@jsonjoy.com/fs-node-utils/lib/types/misc';

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

onlyOnNode20('FsaNodeFs.watchFile()', () => {
  test('throws TypeError when the listener is missing', () => {
    const { fs } = setup();
    expect(() => (fs as any).watchFile('/file.txt')).toThrow(TypeError);
    expect(() => (fs as any).watchFile('/file.txt', { interval: 1 })).toThrow(TypeError);
  });

  test('validates the interval option', () => {
    const { fs } = setup();
    const listener = () => {};
    expect(() => fs.watchFile('/f', { interval: 'x' as any }, listener)).toThrow(TypeError);
    expect(() => fs.watchFile('/f', { interval: -1 }, listener)).toThrow(RangeError);
    expect(() => fs.watchFile('/f', { interval: 1.5 }, listener)).toThrow(RangeError);
  });

  test('calls the listener when the file content changes', async () => {
    const { fs, dir } = setup();
    const file = await dir.getFileHandle('file.txt', { create: true });
    const calls: [misc.IStats, misc.IStats][] = [];
    fs.watchFile('/file.txt', { interval: 3 }, (curr, prev) => calls.push([curr, prev]));
    await tick(10);
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    await until(() => calls.length >= 1);
    const [curr, prev] = calls[0];
    expect(Number(curr.size)).toBe(5);
    expect(Number(prev.size)).toBe(0);
    fs.unwatchFile('/file.txt');
  });

  test('calls the listener once with zeroed stats when the file does not exist', async () => {
    const { fs } = setup();
    const calls: [misc.IStats, misc.IStats][] = [];
    fs.watchFile('/missing.txt', { interval: 3 }, (curr, prev) => calls.push([curr, prev]));
    await until(() => calls.length >= 1);
    const [curr, prev] = calls[0];
    expect(Number(curr.size)).toBe(0);
    expect(curr.mtime.getTime()).toBe(0);
    expect(prev).toBe(curr);
    await tick(15);
    expect(calls.length).toBe(1);
    fs.unwatchFile('/missing.txt');
  });

  test('reports the file appearing after a zeroed start', async () => {
    const { fs, dir } = setup();
    const calls: [misc.IStats, misc.IStats][] = [];
    fs.watchFile('/late.txt', { interval: 3 }, (curr, prev) => calls.push([curr, prev]));
    await until(() => calls.length >= 1);
    const file = await dir.getFileHandle('late.txt', { create: true });
    const writable = await file.createWritable();
    await writable.write('hi');
    await writable.close();
    await until(() => calls.length >= 2);
    const [curr, prev] = calls[1];
    expect(Number(curr.size)).toBe(2);
    expect(Number(prev.size)).toBe(0);
    fs.unwatchFile('/late.txt');
  });

  test('reports the file disappearing with zeroed stats', async () => {
    const { fs, dir } = setup();
    const file = await dir.getFileHandle('file.txt', { create: true });
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    const calls: [misc.IStats, misc.IStats][] = [];
    fs.watchFile('/file.txt', { interval: 3 }, (curr, prev) => calls.push([curr, prev]));
    await tick(10);
    await dir.removeEntry('file.txt');
    await until(() => calls.length >= 1);
    const [curr, prev] = calls[0];
    expect(Number(curr.size)).toBe(0);
    expect(Number(prev.size)).toBe(5);
    fs.unwatchFile('/file.txt');
  });

  test('watching the same path reuses one watcher', async () => {
    const { fs } = setup();
    const watcher1 = fs.watchFile('/file.txt', { interval: 1000 }, () => {});
    const watcher2 = fs.watchFile('/file.txt', { interval: 1000 }, () => {});
    expect(watcher1).toBe(watcher2);
    expect((fs as any).statWatchers.size).toBe(1);
    fs.unwatchFile('/file.txt');
    expect((fs as any).statWatchers.size).toBe(0);
  });

  test('unwatchFile() with a listener keeps the other listeners', async () => {
    const { fs, dir } = setup();
    await dir.getFileHandle('file.txt', { create: true });
    const calls1: unknown[] = [];
    const calls2: unknown[] = [];
    const listener1 = () => calls1.push(1);
    const listener2 = () => calls2.push(1);
    fs.watchFile('/file.txt', { interval: 3 }, listener1);
    fs.watchFile('/file.txt', { interval: 3 }, listener2);
    await tick(10);
    fs.unwatchFile('/file.txt', listener1);
    expect((fs as any).statWatchers.size).toBe(1);
    const file = await dir.getFileHandle('file.txt');
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    await until(() => calls2.length >= 1);
    expect(calls1.length).toBe(0);
    fs.unwatchFile('/file.txt');
    expect((fs as any).statWatchers.size).toBe(0);
  });

  test('unwatchFile() stops polling and event delivery', async () => {
    const { fs, dir } = setup();
    const file = await dir.getFileHandle('file.txt', { create: true });
    const calls: unknown[] = [];
    fs.watchFile('/file.txt', { interval: 3 }, () => calls.push(1));
    await tick(10);
    fs.unwatchFile('/file.txt');
    const writable = await file.createWritable();
    await writable.write('hello');
    await writable.close();
    await tick(15);
    expect(calls.length).toBe(0);
  });
});
