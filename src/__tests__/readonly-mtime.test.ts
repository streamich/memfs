import { memfs } from '../index';
import { dirname } from 'path';

describe('Readonly operations should not mutate parent directory mtime', () => {
  it('statSync should not mutate parent directory mtime', () => {
    const { fs } = memfs({ testFile: 'hello' });
    const path = '/testFile';
    const dir = dirname(path);

    // Set known mtime on parent directory
    const initialMtime = 100000;
    fs.utimesSync(dir, initialMtime, initialMtime);

    const mtimeBefore = fs.statSync(dir).mtimeMs;

    // Read metadata of target path - this should NOT change parent mtime
    fs.statSync(path);

    const mtimeAfter = fs.statSync(dir).mtimeMs;

    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('statSync on directory should not mutate parent directory mtime', () => {
    const { fs } = memfs({ testDir: {} });
    const path = '/testDir';
    const dir = dirname(path);

    // Set known mtime on parent directory
    const initialMtime = 100000;
    fs.utimesSync(dir, initialMtime, initialMtime);

    const mtimeBefore = fs.statSync(dir).mtimeMs;

    // Read metadata of target path - this should NOT change parent mtime
    fs.statSync(path);

    const mtimeAfter = fs.statSync(dir).mtimeMs;

    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('readdirSync should not mutate directory mtime', () => {
    const { fs } = memfs({
      testDir: {
        file1: 'content1',
        file2: 'content2',
      },
    });
    const dir = '/testDir';

    // Set known mtime on directory
    const initialMtime = 100000;
    fs.utimesSync(dir, initialMtime, initialMtime);

    const mtimeBefore = fs.statSync(dir).mtimeMs;

    // Read directory contents - this should NOT change directory mtime
    fs.readdirSync(dir);

    const mtimeAfter = fs.statSync(dir).mtimeMs;

    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('multiple statSync calls should not mutate parent directory mtime', () => {
    const { fs } = memfs({ testFile: 'hello' });
    const path = '/testFile';
    const dir = dirname(path);

    // Set known mtime on parent directory
    const initialMtime = 100000;
    fs.utimesSync(dir, initialMtime, initialMtime);

    const mtimeBefore = fs.statSync(dir).mtimeMs;

    // Multiple reads should not change parent mtime
    fs.statSync(path);
    fs.statSync(path);
    fs.statSync(path);

    const mtimeAfter = fs.statSync(dir).mtimeMs;

    expect(mtimeAfter).toBe(mtimeBefore);
  });
});
