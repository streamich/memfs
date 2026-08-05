import { FsaNodeStats } from '../FsaNodeStats';

describe('FsaNodeStats', () => {
  it('gives each Date field its own instance', () => {
    const stats = new FsaNodeStats(false, 5, 'file', 1234567890000);
    expect(stats.atime.getTime()).toBe(1234567890000);
    expect(stats.mtime.getTime()).toBe(1234567890000);
    expect(stats.ctime.getTime()).toBe(1234567890000);
    expect(stats.birthtime.getTime()).toBe(1234567890000);
    expect(stats.mtime).not.toBe(stats.atime);
    expect(stats.ctime).not.toBe(stats.mtime);
    expect(stats.birthtime).not.toBe(stats.mtime);
    expect(stats.birthtime).not.toBe(stats.ctime);
  });

  it('does not leak a mutation of one Date field into the others', () => {
    const stats = new FsaNodeStats(false, 5, 'file', 1234567890000);
    stats.mtime.setTime(0);
    expect(stats.atime.getTime()).toBe(1234567890000);
    expect(stats.ctime.getTime()).toBe(1234567890000);
    expect(stats.birthtime.getTime()).toBe(1234567890000);
  });

  it('does not share Date instances across instances when mtime is unknown', () => {
    const first = new FsaNodeStats(false, 5, 'file');
    const second = new FsaNodeStats(false, 5, 'file');
    expect(first.mtime).not.toBe(second.mtime);
    first.mtime.setTime(1234567890000);
    expect(second.mtime.getTime()).toBe(0);
    expect(new FsaNodeStats(false, 5, 'file').mtime.getTime()).toBe(0);
  });
});
