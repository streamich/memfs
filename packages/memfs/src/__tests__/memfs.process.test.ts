import { memfs } from '../index';
import type { IProcess } from '../index';

const makeProcess = (overrides: Partial<IProcess> = {}): IProcess => ({
  cwd: () => '/',
  platform: 'linux',
  emitWarning: () => {},
  env: {},
  ...overrides,
});

describe('memfs() with custom process', () => {
  it('accepts a string as second argument (backward compat)', () => {
    const { fs } = memfs({ 'file.txt': 'hello' }, '/app');
    expect(fs.readFileSync('/app/file.txt', 'utf8')).toBe('hello');
  });

  it('accepts an object with cwd as second argument', () => {
    const { fs } = memfs({ 'file.txt': 'hello' }, { cwd: '/app' });
    expect(fs.readFileSync('/app/file.txt', 'utf8')).toBe('hello');
  });

  it('uses process.cwd() from options when no cwd is specified', () => {
    const customProcess = makeProcess({ cwd: () => '/from-process' });
    const { fs } = memfs({ 'file.txt': 'hi' }, { process: customProcess });
    expect(fs.readFileSync('/from-process/file.txt', 'utf8')).toBe('hi');
  });

  it('uses cwd from options, ignoring process.cwd()', () => {
    const customProcess = makeProcess({ cwd: () => '/ignored' });
    const { fs } = memfs({ 'file.txt': 'hi' }, { cwd: '/explicit', process: customProcess });
    expect(fs.readFileSync('/explicit/file.txt', 'utf8')).toBe('hi');
  });

  it('uses custom getuid and getgid from process', () => {
    const customProcess = makeProcess({ getuid: () => 777, getgid: () => 888 });
    const { fs } = memfs({ '/file.txt': 'data' }, { process: customProcess });
    const stat = fs.statSync('/file.txt');
    expect(stat.uid).toBe(777);
    expect(stat.gid).toBe(888);
  });

  it('defaults to / cwd when no options are given', () => {
    const { fs } = memfs({ '/file.txt': 'data' });
    expect(fs.readFileSync('/file.txt', 'utf8')).toBe('data');
  });

  it('exports IProcess type', () => {
    // This is a type-level test - just verifying the export compiles
    const p: IProcess = makeProcess();
    expect(typeof p.cwd).toBe('function');
  });
});
