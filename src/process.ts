// Here we mock the global `process` variable in case we are not in Node's environment.

export interface IProcess {
  getuid(): number;
  getgid(): number;
  cwd(): string;
  platform: string;
  nextTick: (callback: (...args) => void, ...args) => void;
  emitWarning: (message: string, type: string) => void;
  env: {
    MEMFS_DONT_WARN?: boolean;
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
  if (!p.emitWarning)
    p.emitWarning = (message, type) => {
      // tslint:disable-next-line:no-console
      console.warn(`${type}${type ? ': ' : ''}${message}`);
    };
  if (!p.env) p.env = {};
  return p;
}

export default createProcess();
