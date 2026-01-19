import { create } from '../util';

describe('promises.cp', () => {
  it('method exists on promises API', () => {
    const vol = create();
    expect(typeof vol.promises.cp).toBe('function');
  });

  it('copies a file', async () => {
    const vol = create({
      '/foo.txt': 'hello world',
    });

    expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
    expect(() => {
      vol.readFileSync('/bar.txt', 'utf8');
    }).toThrow();

    await vol.promises.cp('/foo.txt', '/bar.txt');

    expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
    expect(vol.readFileSync('/bar.txt', 'utf8')).toBe('hello world');
  });

  it('copies a directory with recursive option', async () => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
      '/src/subdir/file3.txt': 'content3',
    });

    await vol.promises.cp('/src', '/dest', { recursive: true });

    expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
    expect(vol.readFileSync('/dest/file2.txt', 'utf8')).toBe('content2');
    expect(vol.readFileSync('/dest/subdir/file3.txt', 'utf8')).toBe('content3');
  });

  it('rejects when copying directory without recursive option', async () => {
    const vol = create({
      '/src/file.txt': 'content',
    });

    await expect(vol.promises.cp('/src', '/dest')).rejects.toMatchObject({
      code: 'EISDIR',
    });
  });

  it('respects filter option', async () => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
    });

    const filter = (src: string) => !src.includes('file2');

    await vol.promises.cp('/src', '/dest', { recursive: true, filter });

    expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
    expect(() => {
      vol.readFileSync('/dest/file2.txt', 'utf8');
    }).toThrow();
  });

  it('handles errorOnExist option', async () => {
    const vol = create({
      '/src.txt': 'source',
      '/dest.txt': 'destination',
    });

    await expect(vol.promises.cp('/src.txt', '/dest.txt', { errorOnExist: true })).rejects.toMatchObject({
      code: 'EEXIST',
    });
  });

  it('preserves timestamps when requested', async () => {
    const vol = create({
      '/src.txt': 'content',
    });

    const srcStat = vol.statSync('/src.txt');

    await vol.promises.cp('/src.txt', '/dest.txt', { preserveTimestamps: true });

    const destStat = vol.statSync('/dest.txt');
    // Allow for small timestamp differences due to timing
    expect(Math.abs(destStat.atime.getTime() - srcStat.atime.getTime())).toBeLessThan(100);
    expect(Math.abs(destStat.mtime.getTime() - srcStat.mtime.getTime())).toBeLessThan(100);
  });
});
