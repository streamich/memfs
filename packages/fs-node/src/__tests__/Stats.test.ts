import { Volume } from '..';
import { Stats } from '../Stats';
import { tryGetChildNode } from './util';

describe('Stats', () => {
  const setup = () => {
    const vol = Volume.fromJSON({ '/file.txt': 'hello' });
    const node = tryGetChildNode(vol._core.root, 'file.txt');
    return { vol, node };
  };

  describe('Date fields are copies, not aliases of the node timestamps', () => {
    it('gives each field its own Date instance', () => {
      const { node } = setup();
      const stats = Stats.build(node, false);
      expect(stats.atime).not.toBe(node.atime);
      expect(stats.mtime).not.toBe(node.mtime);
      expect(stats.ctime).not.toBe(node.ctime);
      expect(stats.birthtime).not.toBe(node.btime);
      expect(stats.atime.getTime()).toBe(node.atime.getTime());
      expect(stats.mtime.getTime()).toBe(node.mtime.getTime());
      expect(stats.ctime.getTime()).toBe(node.ctime.getTime());
      expect(stats.birthtime.getTime()).toBe(node.btime.getTime());
    });

    it('does not write back into the node when a Date is mutated', () => {
      const { node } = setup();
      const btime = node.btime.getTime();
      const mtime = node.mtime.getTime();
      const stats = Stats.build(node, false);
      stats.birthtime.setTime(0);
      stats.mtime.setTime(0);
      stats.atime.setTime(0);
      stats.ctime.setTime(0);
      expect(node.btime.getTime()).toBe(btime);
      expect(node.mtime.getTime()).toBe(mtime);
    });

    it('does not leak a mutation into a subsequently built Stats', () => {
      const { vol } = setup();
      const first = vol.statSync('/file.txt');
      const birthtimeMs = first.birthtimeMs;
      first.birthtime.setTime(0);
      const second = vol.statSync('/file.txt');
      expect(second.birthtime.getTime()).toBe(birthtimeMs);
      expect(second.birthtimeMs).toBe(birthtimeMs);
    });

    it('keeps birthtime and ctime as separate instances even when equal', () => {
      const { node } = setup();
      node.ctime = new Date(node.btime.getTime());
      const stats = Stats.build(node, false);
      expect(stats.birthtime.getTime()).toBe(stats.ctime.getTime());
      expect(stats.birthtime).not.toBe(stats.ctime);
      stats.ctime.setTime(0);
      expect(stats.birthtime.getTime()).not.toBe(0);
    });
  });
});
