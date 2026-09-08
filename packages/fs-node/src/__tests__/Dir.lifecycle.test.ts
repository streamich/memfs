import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Volume } from '../volume';

describe.each(['node', 'memfs'])('Dir lifecycle (%s)', backend => {
  let path: string;
  let vol: Volume;
  const open = () => (backend === 'node' ? fs.opendirSync(path) : vol.opendirSync(path));
  beforeEach(() => {
    if (backend === 'node') {
      path = fs.mkdtempSync(join(tmpdir(), 'memfs-dir-'));
      fs.writeFileSync(join(path, 'file'), 'content');
    } else {
      path = '/dir';
      vol = Volume.fromJSON({ '/dir/file': 'content' });
    }
  });
  afterEach(() => {
    if (backend === 'node') fs.rmSync(path, { recursive: true });
  });
  it('keeps returning null after reaching the end', async () => {
    const dir = open();
    try {
      expect(dir.readSync()!.name).toBe('file');
      expect(dir.readSync()).toBeNull();
      expect(dir.readSync()).toBeNull();
      expect(await dir.read()).toBeNull();
    } finally {
      dir.closeSync();
    }
  });
  it.each(['complete', 'break', 'throw'])('closes after %s iteration', async mode => {
    const dir = open();
    const error = new Error('consumer failed');
    try {
      for await (const entry of dir) {
        expect(entry.name).toBe('file');
        if (mode === 'break') break;
        if (mode === 'throw') throw error;
      }
    } catch (caught) {
      expect(mode).toBe('throw');
      expect(caught).toBe(error);
    }
    await expect(dir.read()).rejects.toMatchObject({ code: 'ERR_DIR_CLOSED' });
  });
  const itDispose = backend === 'node' && !fs.Dir.prototype[Symbol.asyncDispose] ? it.skip : it;
  itDispose('can be disposed after automatic iterator cleanup', async () => {
    const dir = open();
    for await (const entry of dir) {
      expect(entry.name).toBe('file');
    }
    await expect(dir[Symbol.asyncDispose]()).resolves.toBeUndefined();
    expect(() => dir[Symbol.dispose]()).not.toThrow();
  });
});
