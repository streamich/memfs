// Here we mock the global `process` variable in case we are not in Node's environment.

export type SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS = 'SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS';
export const SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS: SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS =
  'SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS';

export interface IProcess {
  getuid(): number;
  getgid(): number;
  cwd(): string;
  platform: string;
  nextTick: (callback: (...args) => void, ...args) => void;
  env: {
    [SUPPRESS_EXPERIMENTAL_PROMISE_WARNINGS]?: boolean;
  };
}

export function createProcess(p: IProcess = process): IProcess {
  if (!p) {
    try {
      p = require('process');
    } catch (e) {}
  }
  if (!p) p = {} as IProcess;

  if (!p.getuid) p.getuid = () => 0;
  if (!p.getgid) p.getgid = () => 0;
  if (!p.cwd) p.cwd = () => '/';
  if (!p.nextTick) p.nextTick = require('./setImmediate').default;
  if (!p.env) p.env = {};
  return p;
}

export default createProcess();
