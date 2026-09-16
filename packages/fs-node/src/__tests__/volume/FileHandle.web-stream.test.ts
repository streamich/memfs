import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createFs } from '../util';

describe.each(['node', 'memfs'])('FileHandle Web Stream (%s)', backend => {
  it.each([
    ['default', ''],
    ['default', 'hello'],
    ['byob', ''],
    ['byob', 'hello'],
  ])('finishes %s reads for %j', async (mode, content) => {
    const directory = fs.mkdtempSync(join(tmpdir(), 'memfs-web-stream-'));
    const path = join(directory, 'file');
    const api = backend === 'node' ? fs : createFs();
    if (backend === 'memfs') api.mkdirSync(directory, { recursive: true });
    api.writeFileSync(path, content);
    const handle = await api.promises.open(path, 'r');
    const stream = handle.readableWebStream();
    const reader = mode === 'byob' ? stream.getReader({ mode: 'byob' }) : stream.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const consume = async () => {
        const chunks: Buffer[] = [];
        while (true) {
          const result =
            mode === 'byob'
              ? await (reader as ReadableStreamBYOBReader).read(new Uint8Array(3))
              : await (reader as ReadableStreamDefaultReader<Uint8Array>).read();
          if (result.done) break;
          chunks.push(Buffer.from(result.value!));
        }
        return Buffer.concat(chunks).toString();
      };
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('stream did not finish at EOF')), 1000);
      });
      expect(await Promise.race([consume(), timeout])).toBe(content);
    } finally {
      clearTimeout(timer);
      await reader.cancel().catch(() => {});
      await handle.close();
      fs.rmSync(directory, { recursive: true });
    }
  });
});
