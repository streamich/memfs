import { DenoFsWatcher, DenoFsEvent } from './types';

export class CoreFsWatcher implements DenoFsWatcher {
  close(): void {
    throw new Error('Not implemented');
  }

  return?(value?: any): Promise<IteratorResult<DenoFsEvent>> {
    throw new Error('Not implemented');
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<DenoFsEvent> {
    throw new Error('Not implemented');
  }
}