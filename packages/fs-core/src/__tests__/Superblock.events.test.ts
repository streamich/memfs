import { Superblock } from '../Superblock';
import { FsEvent, FsEventType } from '../watch/FsEvent';
import { FLAGS } from '@jsonjoy.com/fs-node-utils';
import { Buffer } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';

const setup = () => {
  const sb = new Superblock();
  const events: FsEvent[] = [];
  sb.onchange = e => events.push(e);
  return { sb, events };
};

describe('Superblock events', () => {
  it('emits CREATE on mkdir', () => {
    const { sb, events } = setup();
    sb.mkdir('/test', 0o777);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.CREATE);
    expect(events[0].steps).toEqual(['', 'test']);
  });

  it('emits CREATE on file open with O_CREAT', () => {
    const { sb, events } = setup();
    sb.open('/test.txt', FLAGS.a, 0o666);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.CREATE);
    expect(events[0].steps).toEqual(['', 'test.txt']);
  });

  it('emits MODIFY on write', () => {
    const { sb, events } = setup();
    const fd = sb.open('/test.txt', FLAGS.w, 0o666);
    sb.write(fd, Buffer.from('hi'), 0, 2, 0);
    expect(events.length).toBe(3);
    expect(events[2].type).toBe(FsEventType.MODIFY);
    expect(events[2].steps).toEqual(['', 'test.txt']);
  });

  it('emits MODIFY on truncate', () => {
    const sb = new Superblock();
    const fd = sb.open('/test.txt', FLAGS.w, 0o666);
    const events: FsEvent[] = [];
    sb.onchange = e => events.push(e);
    sb.ftruncate(fd, 10);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.MODIFY);
    expect(events[0].steps).toEqual(['', 'test.txt']);
  });

  it('emits MOVE on rename', () => {
    const sb = new Superblock();
    sb.open('/test.txt', FLAGS.w, 0o666);
    const events: FsEvent[] = [];
    sb.onchange = e => events.push(e);
    sb.rename('/test.txt', '/test2.txt');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.MOVE);
    expect(events[0].steps).toEqual(['', 'test2.txt']);
    expect(events[0].oldSteps).toEqual(['', 'test.txt']);
  });

  it('emits DELETE on unlink', () => {
    const sb = new Superblock();
    sb.open('/test.txt', FLAGS.w, 0o666);
    const events: FsEvent[] = [];
    sb.onchange = e => events.push(e);
    sb.unlink('/test.txt');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.DELETE);
    expect(events[0].steps).toEqual(['', 'test.txt']);
  });

  it('emits multiple DELETEs recursively for rmdir/rm', () => {
    const sb = new Superblock();
    sb.mkdir('/dir', 0o777);
    sb.mkdir('/dir/sub', 0o777);
    sb.open('/dir/sub/file.txt', FLAGS.w, 0o666);
    const events: FsEvent[] = [];
    sb.onchange = e => events.push(e);
    sb.rm('/dir', false, true);
    expect(events.length).toBe(3);
    expect(events[0].type).toBe(FsEventType.DELETE);
    expect(events[0].steps).toEqual(['', 'dir', 'sub', 'file.txt']);
    expect(events[1].type).toBe(FsEventType.DELETE);
    expect(events[1].steps).toEqual(['', 'dir', 'sub']);
    expect(events[2].type).toBe(FsEventType.DELETE);
    expect(events[2].steps).toEqual(['', 'dir']);
  });
});
