import { Volume } from '../volume';
import { FsEvent, FsEventType } from '@jsonjoy.com/fs-core';

const setup = () => {
  const vol = new Volume();
  const events: FsEvent[] = [];
  (vol as any)._core.onchange = (e: FsEvent) => events.push(e);
  return { vol, events };
};

describe('Volume forwards core events through the public API', () => {
  it('writeFileSync emits MODIFY', () => {
    const { vol, events } = setup();
    vol.writeFileSync('/a.txt', 'hello');
    expect(events.some(e => e.type === FsEventType.MODIFY)).toBe(true);
  });

  it('writeSync(fd) emits MODIFY', () => {
    const { vol, events } = setup();
    const fd = vol.openSync('/b.txt', 'w');
    events.length = 0;
    vol.writeSync(fd, Buffer.from('hello'));
    vol.closeSync(fd);
    expect(events.map(e => e.type)).toContain(FsEventType.MODIFY);
  });

  it('writevSync(fd) emits MODIFY', () => {
    const { vol, events } = setup();
    const fd = vol.openSync('/c.txt', 'w');
    events.length = 0;
    vol.writevSync(fd, [Buffer.from('a'), Buffer.from('b')]);
    vol.closeSync(fd);
    expect(events.map(e => e.type)).toContain(FsEventType.MODIFY);
  });

  it('createWriteStream emits MODIFY', done => {
    const { vol, events } = setup();
    const stream = vol.createWriteStream('/d.txt');
    stream.write('hello');
    stream.end(() => {
      expect(events.map(e => e.type)).toContain(FsEventType.MODIFY);
      done();
    });
  });

  it('mkdirSync emits CREATE, rmdirSync emits DELETE', () => {
    const { vol, events } = setup();
    vol.mkdirSync('/dir');
    vol.rmdirSync('/dir');
    expect(events.map(e => e.type)).toEqual([FsEventType.CREATE, FsEventType.DELETE]);
  });

  it('renameSync emits MOVE with both paths', () => {
    const { vol, events } = setup();
    vol.writeFileSync('/x.txt', '1');
    events.length = 0;
    vol.renameSync('/x.txt', '/y.txt');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(FsEventType.MOVE);
    expect(events[0].steps).toEqual(['', 'y.txt']);
    expect(events[0].oldSteps).toEqual(['', 'x.txt']);
  });

  it('metadata ops emit MODIFY via Volume (chmod, utimes)', () => {
    const { vol, events } = setup();
    vol.writeFileSync('/m.txt', '1');
    events.length = 0;
    vol.chmodSync('/m.txt', 0o600);
    vol.utimesSync('/m.txt', new Date(), new Date());
    expect(events.map(e => e.type)).toEqual([FsEventType.MODIFY, FsEventType.MODIFY]);
  });
});
