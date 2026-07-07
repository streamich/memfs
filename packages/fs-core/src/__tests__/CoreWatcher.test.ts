import { Superblock } from '../Superblock';
import { CoreWatcher, CoreWatchEvent, CoreWatchOptions } from '../watch/CoreWatcher';
import { FsEventType } from '../watch/FsEvent';
import { FLAGS } from '@jsonjoy.com/fs-node-utils';
import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';

const setup = (path: string, opts?: CoreWatchOptions, prepare?: (sb: Superblock) => void) => {
  const sb = new Superblock();
  if (prepare) prepare(sb);
  const watcher = new CoreWatcher(sb, path, opts);
  const events: CoreWatchEvent[] = [];
  watcher.changes.listen(e => events.push(e));
  return { sb, watcher, events };
};

describe('CoreWatcher', () => {
  it('throws ENOENT when the watch target does not exist', () => {
    const sb = new Superblock();
    expect(() => new CoreWatcher(sb, '/missing')).toThrow(/ENOENT/);
  });

  describe('non-recursive directory watch', () => {
    it('reports direct children only', () => {
      const { sb, events } = setup('/dir', {}, s => s.mkdir('/dir', 0o777));
      sb.open('/dir/a.txt', FLAGS.w, 0o666);
      sb.mkdir('/dir/sub', 0o777);
      sb.open('/dir/sub/deep.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(2);
      expect(events[0].type).toBe(FsEventType.CREATE);
      expect(events[0].steps).toEqual(['a.txt']);
      expect(events[1].type).toBe(FsEventType.CREATE);
      expect(events[1].steps).toEqual(['sub']);
    });

    it('reports MODIFY and DELETE of direct children', () => {
      const { sb, events } = setup('/dir', {}, s => {
        s.mkdir('/dir', 0o777);
        s.writeFile('/dir/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      const fd = sb.open('/dir/a.txt', FLAGS['r+'], 0o666);
      sb.write(fd, Buffer.from('hi'), 0, 2, 0);
      sb.unlink('/dir/a.txt');
      expect(events.map(e => e.type)).toEqual([FsEventType.MODIFY, FsEventType.DELETE]);
      expect(events[0].steps).toEqual(['a.txt']);
      expect(events[1].steps).toEqual(['a.txt']);
    });
  });

  describe('recursive directory watch', () => {
    it('reports events anywhere in the subtree with relative steps', () => {
      const { sb, events } = setup('/dir', { recursive: true }, s => s.mkdir('/dir', 0o777));
      sb.mkdir('/dir/sub', 0o777);
      sb.open('/dir/sub/deep.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(2);
      expect(events[1].type).toBe(FsEventType.CREATE);
      expect(events[1].steps).toEqual(['sub', 'deep.txt']);
    });

    it('ignores events outside the subtree', () => {
      const { sb, events } = setup('/dir', { recursive: true }, s => s.mkdir('/dir', 0o777));
      sb.open('/other.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(0);
    });
  });

  describe('file watch', () => {
    it('reports self MODIFY and ATTRIB with empty steps', () => {
      const { sb, events } = setup('/f.txt', {}, s => s.writeFile('/f.txt', Buffer.from('1'), FLAGS.w, 0o666));
      const fd = sb.open('/f.txt', FLAGS['r+'], 0o666);
      sb.write(fd, Buffer.from('hi'), 0, 2, 0);
      sb.chmod('/f.txt', 0o600);
      expect(events.map(e => e.type)).toEqual([FsEventType.MODIFY, FsEventType.ATTRIB]);
      expect(events[0].steps).toEqual([]);
      expect(events[1].steps).toEqual([]);
    });

    it('reports MODIFY through another hard link to the same node', () => {
      const { sb, events } = setup('/f.txt', {}, s => {
        s.writeFile('/f.txt', Buffer.from('1'), FLAGS.w, 0o666);
        s.link('/f.txt', '/hard.txt');
      });
      const fd = sb.open('/hard.txt', FLAGS['r+'], 0o666);
      sb.write(fd, Buffer.from('hi'), 0, 2, 0);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.MODIFY);
      expect(events[0].steps).toEqual([]);
    });
  });

  describe('moves', () => {
    it('reports a move within scope as MOVE with relative old and new steps', () => {
      const { sb, events } = setup('/dir', { recursive: true }, s => {
        s.mkdir('/dir', 0o777);
        s.writeFile('/dir/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      sb.rename('/dir/a.txt', '/dir/b.txt');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.MOVE);
      expect(events[0].steps).toEqual(['b.txt']);
      expect(events[0].oldSteps).toEqual(['a.txt']);
    });

    it('reports a move out of scope as DELETE', () => {
      const { sb, events } = setup('/dir', { recursive: true }, s => {
        s.mkdir('/dir', 0o777);
        s.mkdir('/out', 0o777);
        s.writeFile('/dir/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      sb.rename('/dir/a.txt', '/out/a.txt');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.DELETE);
      expect(events[0].steps).toEqual(['a.txt']);
    });

    it('reports a move into scope as CREATE', () => {
      const { sb, events } = setup('/dir', { recursive: true }, s => {
        s.mkdir('/dir', 0o777);
        s.mkdir('/out', 0o777);
        s.writeFile('/out/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      sb.rename('/out/a.txt', '/dir/a.txt');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.CREATE);
      expect(events[0].steps).toEqual(['a.txt']);
    });

    it('reports a depth-crossing move as DELETE in non-recursive mode', () => {
      const { sb, events } = setup('/dir', {}, s => {
        s.mkdir('/dir', 0o777);
        s.mkdir('/dir/sub', 0o777);
        s.writeFile('/dir/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      sb.rename('/dir/a.txt', '/dir/sub/a.txt');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.DELETE);
      expect(events[0].steps).toEqual(['a.txt']);
    });
  });

  describe('watch target rename and delete', () => {
    it('reports rename of the target itself as MOVE with empty steps and keeps watching', () => {
      const { sb, watcher, events } = setup('/dir', { recursive: true }, s => s.mkdir('/dir', 0o777));
      sb.rename('/dir', '/dir2');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.MOVE);
      expect(events[0].steps).toEqual([]);
      expect(watcher.link.steps).toEqual(['', 'dir2']);
      sb.open('/dir2/x.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(2);
      expect(events[1].type).toBe(FsEventType.CREATE);
      expect(events[1].steps).toEqual(['x.txt']);
    });

    it('keeps watching when an ancestor is renamed', () => {
      const { sb, events } = setup('/a/b', { recursive: true }, s => {
        s.mkdir('/a', 0o777);
        s.mkdir('/a/b', 0o777);
      });
      sb.rename('/a', '/c');
      expect(events.length).toBe(0);
      sb.open('/c/b/f.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.CREATE);
      expect(events[0].steps).toEqual(['f.txt']);
    });

    it('reports deletion of the target as terminal DELETE with empty steps and closes', () => {
      const { sb, watcher, events } = setup('/f.txt', {}, s => s.writeFile('/f.txt', Buffer.from('1'), FLAGS.w, 0o666));
      sb.unlink('/f.txt');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.DELETE);
      expect(events[0].steps).toEqual([]);
      expect(watcher.closed).toBe(true);
      sb.writeFile('/f.txt', Buffer.from('again'), FLAGS.w, 0o666);
      expect(events.length).toBe(1);
    });

    it('reports subtree deletions before the terminal DELETE on recursive rm', () => {
      const { sb, watcher, events } = setup('/dir', { recursive: true }, s => {
        s.mkdir('/dir', 0o777);
        s.writeFile('/dir/a.txt', Buffer.from('1'), FLAGS.w, 0o666);
      });
      sb.rm('/dir', false, true);
      expect(events.length).toBe(2);
      expect(events[0].type).toBe(FsEventType.DELETE);
      expect(events[0].steps).toEqual(['a.txt']);
      expect(events[1].type).toBe(FsEventType.DELETE);
      expect(events[1].steps).toEqual([]);
      expect(watcher.closed).toBe(true);
    });
  });

  describe('symlinks', () => {
    it('follows symlinks by default', () => {
      const { sb, events } = setup('/ln', {}, s => {
        s.writeFile('/target.txt', Buffer.from('1'), FLAGS.w, 0o666);
        s.symlink('/target.txt', '/ln');
      });
      const fd = sb.open('/target.txt', FLAGS['r+'], 0o666);
      sb.write(fd, Buffer.from('hi'), 0, 2, 0);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.MODIFY);
      expect(events[0].steps).toEqual([]);
    });

    it('watches the symlink itself with follow: false', () => {
      const { sb, events } = setup('/ln', { follow: false }, s => {
        s.writeFile('/target.txt', Buffer.from('1'), FLAGS.w, 0o666);
        s.symlink('/target.txt', '/ln');
      });
      const fd = sb.open('/target.txt', FLAGS['r+'], 0o666);
      sb.write(fd, Buffer.from('hi'), 0, 2, 0);
      expect(events.length).toBe(0);
      sb.utimes('/ln', 1, 1, false);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(FsEventType.ATTRIB);
      expect(events[0].steps).toEqual([]);
    });
  });

  describe('close()', () => {
    it('stops delivery and is idempotent', () => {
      const { sb, watcher, events } = setup('/dir', {}, s => s.mkdir('/dir', 0o777));
      watcher.close();
      watcher.close();
      expect(watcher.closed).toBe(true);
      sb.open('/dir/a.txt', FLAGS.w, 0o666);
      expect(events.length).toBe(0);
    });
  });

  it('supports watching the root directory', () => {
    const sb = new Superblock();
    const watcher = new CoreWatcher(sb, '/');
    const events: CoreWatchEvent[] = [];
    watcher.changes.listen(e => events.push(e));
    sb.mkdir('/dir', 0o777);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.CREATE);
    expect(events[0].steps).toEqual(['dir']);
  });
});
