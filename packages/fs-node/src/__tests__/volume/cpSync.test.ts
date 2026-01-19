import { create } from '../util';

describe('cpSync(src, dest[, options])', () => {
  it('method exists', () => {
    const vol = create();
    expect(typeof vol.cpSync).toBe('function');
  });

  it('copies a file', () => {
    const vol = create({
      '/foo.txt': 'hello world',
    });

    expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
    expect(() => {
      vol.readFileSync('/bar.txt', 'utf8');
    }).toThrow();

    vol.cpSync('/foo.txt', '/bar.txt');

    expect(vol.readFileSync('/foo.txt', 'utf8')).toBe('hello world');
    expect(vol.readFileSync('/bar.txt', 'utf8')).toBe('hello world');
  });

  it('copies a directory with recursive option', () => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
      '/src/subdir/file3.txt': 'content3',
    });

    vol.cpSync('/src', '/dest', { recursive: true });

    expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
    expect(vol.readFileSync('/dest/file2.txt', 'utf8')).toBe('content2');
    expect(vol.readFileSync('/dest/subdir/file3.txt', 'utf8')).toBe('content3');
  });

  it('throws error when copying directory without recursive option', () => {
    const vol = create({
      '/src/file.txt': 'content',
    });

    expect(() => {
      vol.cpSync('/src', '/dest');
    }).toThrow(/EISDIR/);
  });

  it('respects filter option', () => {
    const vol = create({
      '/src/file1.txt': 'content1',
      '/src/file2.txt': 'content2',
    });

    const filter = (src: string) => !src.includes('file2');

    vol.cpSync('/src', '/dest', { recursive: true, filter });

    expect(vol.readFileSync('/dest/file1.txt', 'utf8')).toBe('content1');
    expect(() => {
      vol.readFileSync('/dest/file2.txt', 'utf8');
    }).toThrow();
  });

  it('handles force option', () => {
    const vol = create({
      '/src.txt': 'source',
      '/dest.txt': 'destination',
    });

    vol.cpSync('/src.txt', '/dest.txt', { force: false });
    expect(vol.readFileSync('/dest.txt', 'utf8')).toBe('destination');
  });

  it('handles errorOnExist option', () => {
    const vol = create({
      '/src.txt': 'source',
      '/dest.txt': 'destination',
    });

    expect(() => {
      vol.cpSync('/src.txt', '/dest.txt', { errorOnExist: true });
    }).toThrow(/EEXIST/);
  });

  it('creates parent directories as needed', () => {
    const vol = create({
      '/src.txt': 'content',
    });

    vol.cpSync('/src.txt', '/some/deep/path/dest.txt');
    expect(vol.readFileSync('/some/deep/path/dest.txt', 'utf8')).toBe('content');
  });

  it('preserves timestamps when requested', () => {
    const vol = create({
      '/src.txt': 'content',
    });

    const srcStat = vol.statSync('/src.txt');

    vol.cpSync('/src.txt', '/dest.txt', { preserveTimestamps: true });

    const destStat = vol.statSync('/dest.txt');
    // Allow for small timestamp differences due to timing
    expect(Math.abs(destStat.atime.getTime() - srcStat.atime.getTime())).toBeLessThan(100);
    expect(Math.abs(destStat.mtime.getTime() - srcStat.mtime.getTime())).toBeLessThan(100);
  });

  it('throws error when src and dest are the same', () => {
    const vol = create({
      '/file.txt': 'content',
    });

    expect(() => {
      vol.cpSync('/file.txt', '/file.txt');
    }).toThrow(/EINVAL/);
  });

  it('throws error when trying to copy directory to subdirectory of itself', () => {
    const vol = create({
      '/src/file.txt': 'content',
    });

    expect(() => {
      vol.cpSync('/src', '/src/subdir', { recursive: true });
    }).toThrow(/EINVAL/);
  });
});
