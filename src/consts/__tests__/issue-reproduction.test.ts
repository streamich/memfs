import * as nodefs from 'fs';
import { memfs } from '../../index';
import { FLAG } from '../FLAG';

// Reproduction of the issue described in the GitHub issue
async function writeAtPos(fs: typeof nodefs.promises, file: string, data: Uint8Array, pos: number) {
  // Using memfs numeric flags (previously problematic with native fs):
  const flags = FLAG.O_RDWR | FLAG.O_CREAT; // expected: create if missing
  const handle = await fs.open(file, flags); // Should now work with native fs

  if (pos === -1) {
    const st = await handle.stat();
    pos = Number(st.size);
  }
  await handle.write(data, 0, data.byteLength, pos);
  await handle.close();
}

describe('Issue reproduction test', () => {
  const testFile = require('path').join(__dirname, 'issue_test.txt');

  afterEach(() => {
    try {
      nodefs.unlinkSync(testFile);
    } catch {
      // ignore
    }
  });

  test('memfs FLAG constants should work with native fs.promises.open (issue reproduction)', async () => {
    const { fs: mem } = memfs();
    const data = new Uint8Array([46]); // '.'

    // 1) Should work with memfs using FLAG constants
    await writeAtPos(mem.promises as any, '/a.txt', data, 0);
    expect(mem.existsSync('/a.txt')).toBe(true);

    // 2) Should also work with native fs using same FLAG constants (this was the issue)
    await writeAtPos(nodefs.promises as any, testFile, data, 0);
    expect(nodefs.existsSync(testFile)).toBe(true);

    // Verify content
    const content = nodefs.readFileSync(testFile);
    expect(content[0]).toBe(46);
  });

  test('FLAG constants can be imported from memfs/lib/consts/FLAG', () => {
    // This import pattern should work after the fix
    const importedFLAG = require('../../consts/FLAG').FLAG;
    expect(importedFLAG).toBeDefined();
    expect(importedFLAG.O_RDWR).toBe(2);
    expect(importedFLAG.O_CREAT).toBe(64);

    // Should match Node.js constants
    expect(importedFLAG.O_RDWR).toBe(nodefs.constants.O_RDWR);
    expect(importedFLAG.O_CREAT).toBe(nodefs.constants.O_CREAT);
  });

  test('Original workaround with string flags still works', async () => {
    const data = new Uint8Array([46]); // '.'

    // The workaround mentioned in the issue should still work
    const handle = await nodefs.promises.open(testFile, 'r+').catch(async (err: any) => {
      if (err?.code === 'ENOENT') {
        await nodefs.promises.writeFile(testFile, new Uint8Array());
        return nodefs.promises.open(testFile, 'r+');
      }
      throw err;
    });

    await handle.write(data, 0, data.byteLength, 0);
    await handle.close();

    expect(nodefs.existsSync(testFile)).toBe(true);
    const content = nodefs.readFileSync(testFile);
    expect(content[0]).toBe(46);
  });
});
