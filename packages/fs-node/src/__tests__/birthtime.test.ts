import { createFs } from './util';

describe('birthtime', () => {
  const advance = () => new Promise(resolve => setTimeout(resolve, 10));

  it('stays stable across writes to a file', async () => {
    const fs = createFs();
    await fs.promises.writeFile('/file.txt', 'one');
    const { birthtime, birthtimeMs } = await fs.promises.stat('/file.txt');
    await advance();
    await fs.promises.writeFile('/file.txt', 'two');
    await fs.promises.appendFile('/file.txt', 'three');
    const stats = await fs.promises.stat('/file.txt');
    expect(stats.birthtimeMs).toBe(birthtimeMs);
    expect(stats.birthtime.getTime()).toBe(birthtime.getTime());
    expect(stats.mtimeMs).toBeGreaterThan(birthtimeMs);
    expect(stats.ctimeMs).toBeGreaterThan(birthtimeMs);
  });

  it('stays stable across truncate, chmod and chown', async () => {
    const fs = createFs();
    await fs.promises.writeFile('/file.txt', 'hello');
    const { birthtimeMs } = await fs.promises.stat('/file.txt');
    await advance();
    await fs.promises.truncate('/file.txt', 2);
    await fs.promises.chmod('/file.txt', 0o600);
    await fs.promises.chown('/file.txt', process.getuid?.() ?? 0, process.getgid?.() ?? 0);
    const stats = await fs.promises.stat('/file.txt');
    expect(stats.birthtimeMs).toBe(birthtimeMs);
    expect(stats.ctimeMs).toBeGreaterThan(birthtimeMs);
  });

  it('stays stable across utimes', async () => {
    const fs = createFs();
    await fs.promises.writeFile('/file.txt', 'hello');
    const { birthtimeMs } = await fs.promises.stat('/file.txt');
    await advance();
    await fs.promises.utimes('/file.txt', new Date(0), new Date(0));
    const stats = await fs.promises.stat('/file.txt');
    expect(stats.birthtimeMs).toBe(birthtimeMs);
    expect(stats.mtimeMs).toBe(0);
  });

  it('stays stable for a directory when its contents change', async () => {
    const fs = createFs();
    await fs.promises.mkdir('/dir');
    const { birthtimeMs } = await fs.promises.stat('/dir');
    await advance();
    await fs.promises.writeFile('/dir/file.txt', 'hello');
    await fs.promises.unlink('/dir/file.txt');
    const stats = await fs.promises.stat('/dir');
    expect(stats.birthtimeMs).toBe(birthtimeMs);
    expect(stats.mtimeMs).toBeGreaterThan(birthtimeMs);
  });

  it('is reported for bigint stats', async () => {
    const fs = createFs();
    fs.writeFileSync('/file.txt', 'one');
    const { birthtimeMs, birthtimeNs } = fs.statSync('/file.txt', { bigint: true });
    await advance();
    fs.writeFileSync('/file.txt', 'two');
    const stats = fs.statSync('/file.txt', { bigint: true });
    expect(stats.birthtimeMs).toBe(birthtimeMs);
    expect(stats.birthtimeNs).toBe(birthtimeNs);
    expect(stats.birthtimeNs).toBe(birthtimeMs * BigInt(1000000));
    expect(stats.ctimeMs).toBeGreaterThan(birthtimeMs);
  });

  it('is distinct per file', async () => {
    const fs = createFs();
    await fs.promises.writeFile('/first.txt', 'one');
    await advance();
    await fs.promises.writeFile('/second.txt', 'two');
    const first = await fs.promises.stat('/first.txt');
    const second = await fs.promises.stat('/second.txt');
    expect(second.birthtimeMs).toBeGreaterThan(first.birthtimeMs);
  });
});
