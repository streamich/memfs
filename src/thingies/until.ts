import {tick} from './tick';

export const until = async (check: () => boolean | Promise<boolean>, pollInterval: number = 1) => {
  do {
    if (await check()) return;
    await tick(pollInterval);
  } while (true);
};
