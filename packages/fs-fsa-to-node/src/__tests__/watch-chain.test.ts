import { memfs } from 'memfs';
import { nodeToFsa, NodeFileSystemObserver } from '@jsonjoy.com/fs-node-to-fsa';
import { FsaNodeFs } from '../FsaNodeFs';
import { onlyOnNode20 } from './util';

const tick = (ms: number = 1) => new Promise(r => setTimeout(r, ms));

const until = async (check: () => boolean | Promise<boolean>, pollInterval: number = 1) => {
  do {
    if (await check()) return;
    await tick(pollInterval);
  } while (true);
};

/**
 * Chains both bridges: a memfs volume is exposed as FSA through
 * `fs-node-to-fsa` (including its `NodeFileSystemObserver`), and that FSA is
 * exposed back as a Node.js `fs` API through `fs-fsa-to-node`, so `fs.watch`
 * events flow across the whole stack.
 */
const setup = () => {
  const { fs: mfs } = memfs({ mountpoint: null });
  const dir = nodeToFsa(mfs, '/mountpoint', { mode: 'readwrite' });
  class Observer extends NodeFileSystemObserver {
    constructor(callback: ConstructorParameters<typeof NodeFileSystemObserver>[1]) {
      super(mfs as any, callback);
    }
  }
  const fs = new FsaNodeFs(dir, undefined, { FileSystemObserver: Observer });
  return { fs, mfs };
};

onlyOnNode20('fs.watch() across both bridges', () => {
  test('file creation arrives as a "rename" event', async () => {
    const { fs, mfs } = setup();
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    mfs.writeFileSync('/mountpoint/file.txt', 'hello');
    await until(() => events.length >= 1);
    expect(events[0]).toEqual(['rename', 'file.txt']);
    watcher.close();
  });

  test('file modification arrives as a "change" event', async () => {
    const { fs, mfs } = setup();
    mfs.writeFileSync('/mountpoint/file.txt', '');
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    mfs.appendFileSync('/mountpoint/file.txt', 'more');
    await until(() => events.length >= 1);
    expect(events[0]).toEqual(['change', 'file.txt']);
    watcher.close();
  });

  test('file deletion arrives as a "rename" event', async () => {
    const { fs, mfs } = setup();
    mfs.writeFileSync('/mountpoint/file.txt', 'x');
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    mfs.unlinkSync('/mountpoint/file.txt');
    await until(() => events.length >= 1);
    expect(events[0]).toEqual(['rename', 'file.txt']);
    watcher.close();
  });

  test('a rename arrives as two "rename" events, one per path', async () => {
    const { fs, mfs } = setup();
    mfs.writeFileSync('/mountpoint/a.txt', 'x');
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', (eventType, filename) => events.push([eventType, filename]));
    await tick();
    mfs.renameSync('/mountpoint/a.txt', '/mountpoint/b.txt');
    await until(() => events.length >= 2);
    expect(events.every(([eventType]) => eventType === 'rename')).toBe(true);
    expect(events.map(([, filename]) => filename).sort()).toEqual(['a.txt', 'b.txt']);
    watcher.close();
  });

  test('recursive watch reports nested paths', async () => {
    const { fs, mfs } = setup();
    mfs.mkdirSync('/mountpoint/sub');
    const events: [string, unknown][] = [];
    const watcher = fs.watch('/', { recursive: true }, (eventType, filename) => events.push([eventType, filename]));
    await tick();
    mfs.writeFileSync('/mountpoint/sub/deep.txt', 'x');
    await until(() => events.length >= 1);
    expect(events[0]).toEqual(['rename', 'sub/deep.txt']);
    watcher.close();
  });
});
