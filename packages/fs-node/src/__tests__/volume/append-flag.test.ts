import { create, memfs } from '../util';

describe('O_APPEND semantics', () => {
  it('ignores an explicit position, writing at the end of file', () => {
    const vol = create({ '/a': 'AAAA' });
    const fd = vol.openSync('/a', 'a');
    vol.writeSync(fd, Buffer.from('X'), 0, 1, 0);
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('AAAAX');
  });

  it('does not grow the file when given a position past the end', () => {
    const vol = create({ '/a': 'AAAA' });
    const fd = vol.openSync('/a', 'a');
    vol.writeSync(fd, Buffer.from('X'), 0, 1, 100);
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('AAAAX');
    expect(vol.statSync('/a').size).toBe(5);
  });

  it('interleaves writes from two append descriptors', () => {
    const vol = create({ '/a': '' });
    const fd1 = vol.openSync('/a', 'a');
    const fd2 = vol.openSync('/a', 'a');
    vol.writeSync(fd1, Buffer.from('111'));
    vol.writeSync(fd2, Buffer.from('222'));
    vol.writeSync(fd1, Buffer.from('333'));
    vol.closeSync(fd1);
    vol.closeSync(fd2);
    expect(vol.readFileSync('/a', 'utf8')).toBe('111222333');
  });

  it('appends after the file was grown through another descriptor', () => {
    const vol = create({ '/a': '' });
    const fd = vol.openSync('/a', 'a');
    vol.appendFileSync('/a', 'GROWN');
    vol.writeSync(fd, Buffer.from('Z'));
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('GROWNZ');
  });

  it('appends after the file was truncated through another descriptor', () => {
    const vol = create({ '/a': 'LONGCONTENT' });
    const fd = vol.openSync('/a', 'a');
    vol.truncateSync('/a', 0);
    vol.writeSync(fd, Buffer.from('Q'));
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('Q');
  });

  it('appends after the file was truncated through the same descriptor', () => {
    const vol = create({ '/a': 'LONGCONTENT' });
    const fd = vol.openSync('/a', 'a');
    vol.ftruncateSync(fd, 2);
    vol.writeSync(fd, Buffer.from('Q'));
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('LOQ');
  });

  it('starts reads at the beginning of the file in "a+" mode', () => {
    const vol = create({ '/a': 'HEAD' });
    const fd = vol.openSync('/a', 'a+');
    const buf = Buffer.alloc(2);
    expect(vol.readSync(fd, buf, 0, 2, null)).toBe(2);
    expect(buf.toString()).toBe('HE');
    vol.writeSync(fd, Buffer.from('TAIL'));
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('HEADTAIL');
  });

  it('leaves the offset at the end of file after an append write', () => {
    const vol = create({ '/a': '0123456789' });
    const fd = vol.openSync('/a', 'a+');
    vol.writeSync(fd, Buffer.from('AB'));
    const buf = Buffer.alloc(4);
    expect(vol.readSync(fd, buf, 0, 4, null)).toBe(0);
    vol.closeSync(fd);
  });

  it('appends every buffer of a writev, ignoring the position', () => {
    const vol = create({ '/a': 'AAAA' });
    const fd = vol.openSync('/a', 'a');
    vol.writevSync(fd, [Buffer.from('1'), Buffer.from('2')], 0);
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('AAAA12');
  });

  it('appends when writeFileSync targets an append descriptor', () => {
    const vol = create({ '/a': 'AAAA' });
    const fd = vol.openSync('/a', 'a');
    vol.writeFileSync(fd, 'ZZ');
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('AAAAZZ');
  });

  it('appends from a write stream, ignoring the "start" option', done => {
    const { fs } = memfs({ a: 'AAAA' });
    const stream = (fs as any).createWriteStream('/a', { flags: 'a', start: 0 });
    stream.end('W', () => {
      expect(fs.readFileSync('/a', 'utf8')).toBe('AAAAW');
      done();
    });
  });

  it('writeFileSync on a non-append descriptor writes at its current position', () => {
    const vol = create({ '/a': 'AAAAAAAA' });
    const fd = vol.openSync('/a', 'r+');
    vol.writeSync(fd, Buffer.from('X'));
    vol.writeFileSync(fd, 'ZZ');
    vol.closeSync(fd);
    expect(vol.readFileSync('/a', 'utf8')).toBe('XZZAAAAA');
  });
});
