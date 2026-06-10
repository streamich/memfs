import { Writer } from '@jsonjoy.com/buffers/lib/Writer';

export const writer = new Writer(1024 * 32);

export const validateEntryName = (name: string): void => {
  if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1 || name.indexOf('\\') !== -1)
    throw new Error(`Invalid snapshot entry name: ${JSON.stringify(name)}`);
};
