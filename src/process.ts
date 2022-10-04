// Here we mock the global `process` variable in case we are not in Node's environment.

import setImmediate from './setImmediate';
import process from 'process';

export interface IProcess {
  getuid?(): number;

  getgid?(): number;

  cwd(): string;

  platform: string;
  nextTick: (callback: (...args) => void, ...args) => void;
  emitWarning: (message: string, type: string) => void;
  env: {};
}

export function createProcess(): IProcess {
  const p: IProcess = process || ({} as IProcess);

  if (!p.cwd) p.cwd = () => '/';
  if (!p.nextTick) p.nextTick = setImmediate;
  if (!p.emitWarning)
    p.emitWarning = (message, type) => {
      // tslint:disable-next-line:no-console
      console.warn(`${type}${type ? ': ' : ''}${message}`);
    };
  if (!p.env) p.env = {};
  return p;
}

export default createProcess();
