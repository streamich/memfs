import { memfs } from '../util';

describe('readFile ctime issue', () => {
  it('should NOT change ctime when readFile is called', async () => {
    const { fs } = memfs();

    const file = '/test-readfile-ctime.txt';

    // Create the file
    await fs.promises.writeFile(file, 'test content');

    // Get initial ctime
    const initialStat = await fs.promises.stat(file);
    const initialCtime = initialStat.ctimeMs;

    // Wait a bit to ensure any ctime change would be detectable
    await new Promise(resolve => setTimeout(resolve, 10));

    // Read the file (this should only update atime, not ctime)
    await fs.promises.readFile(file);

    // Check ctime again
    const afterReadStat = await fs.promises.stat(file);
    const afterReadCtime = afterReadStat.ctimeMs;

    // ctime should be unchanged after read
    expect(afterReadCtime).toBe(initialCtime);
  });

  it('should change atime when readFile is called', async () => {
    const { fs } = memfs();

    const file = '/test-readfile-atime.txt';

    // Create the file
    await fs.promises.writeFile(file, 'test content');

    // Get initial atime
    const initialStat = await fs.promises.stat(file);
    const initialAtime = initialStat.atimeMs;

    // Wait a bit to ensure any atime change would be detectable
    await new Promise(resolve => setTimeout(resolve, 10));

    // Read the file (this should update atime)
    await fs.promises.readFile(file);

    // Check atime again
    const afterReadStat = await fs.promises.stat(file);
    const afterReadAtime = afterReadStat.atimeMs;

    // atime should be updated after read
    expect(afterReadAtime).toBeGreaterThan(initialAtime);
  });

  it('should NOT change ctime when readFileSync is called', () => {
    const { fs } = memfs();

    const file = '/test-readfilesync-ctime.txt';

    // Create the file
    fs.writeFileSync(file, 'test content');

    // Get initial ctime
    const initialStat = fs.statSync(file);
    const initialCtime = initialStat.ctimeMs;

    // Read the file (this should only update atime, not ctime)
    fs.readFileSync(file);

    // Check ctime again
    const afterReadStat = fs.statSync(file);
    const afterReadCtime = afterReadStat.ctimeMs;

    // ctime should be unchanged after read
    expect(afterReadCtime).toBe(initialCtime);
  });
});
