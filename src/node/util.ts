import type { FsCallbackApi } from './types';

export function promisify(
  fs: FsCallbackApi,
  fn: string,
  getResult: (result: any) => any = input => input,
): (...args) => Promise<any> {
  return (...args) =>
    new Promise((resolve, reject) => {
      fs[fn].bind(fs)(...args, (error, result) => {
        if (error) return reject(error);
        return resolve(getResult(result));
      });
    });
}
