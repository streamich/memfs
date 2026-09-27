import { SyncMessenger } from '../SyncMessenger';
import { FsaNodeSyncAdapterWorker } from '../FsaNodeSyncAdapterWorker';
import { FsaNodeWorkerMessageCode } from '../constants';
import { encoder } from '../../json';
import type { IFileSystemDirectoryHandle } from '@jsonjoy.com/fs-fsa';

describe('synchronous worker timeout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const respondAfter = (sab: SharedArrayBuffer, delay: number, response: Uint8Array) => {
    let elapsed = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      if (elapsed === delay) {
        const header = new Int32Array(sab);
        new Uint8Array(sab).set(response, 16);
        header[2] = response.length;
        header[1] = 1;
      }
      return elapsed++;
    });
  };

  test('returns a response within the default timeout', () => {
    const sab = new SharedArrayBuffer(128);
    const response = new Uint8Array([4, 5]);
    respondAfter(sab, 50, response);
    expect(new SyncMessenger(sab).callSync(new Uint8Array([1, 2, 3]))).toEqual(response);
  });

  test('keeps the default timeout of 100 milliseconds', () => {
    const sab = new SharedArrayBuffer(128);
    respondAfter(sab, 200, new Uint8Array([4, 5]));
    expect(() => new SyncMessenger(sab).callSync(new Uint8Array([1]))).toThrow('Timeout');
    expect(Date.now()).toBe(102);
  });

  test('allows a response after 100 milliseconds with a longer timeout', () => {
    const sab = new SharedArrayBuffer(128);
    const response = new Uint8Array([4, 5]);
    respondAfter(sab, 200, response);
    expect(new SyncMessenger(sab, 500).callSync(new Uint8Array([1, 2, 3]))).toEqual(response);
  });

  test('still throws when the configured timeout is exceeded', () => {
    const sab = new SharedArrayBuffer(128);
    respondAfter(sab, 600, new Uint8Array([4, 5]));
    expect(() => new SyncMessenger(sab, 500).callSync(new Uint8Array([1]))).toThrow('Timeout');
    expect(Date.now()).toBe(502);
  });

  test('passes the timeout from FsaNodeSyncAdapterWorker.start to synchronous operations', async () => {
    const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    const worker = {
      onmessage: (_event: { data: unknown[] }) => {},
      postMessage: jest.fn(),
    };
    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: jest.fn(() => worker) });
    try {
      const sab = new SharedArrayBuffer(128);
      const dir = {} as IFileSystemDirectoryHandle;
      const started = FsaNodeSyncAdapterWorker.start('worker.js', dir, 500);
      await Promise.resolve();
      worker.onmessage({ data: [FsaNodeWorkerMessageCode.Init, sab] });
      const [, rootId] = worker.postMessage.mock.calls[0][0];
      worker.onmessage({ data: [FsaNodeWorkerMessageCode.RootSet, rootId] });
      const adapter = await started;
      const response = new Uint8Array([4, 5]);
      respondAfter(sab, 200, encoder.encode([FsaNodeWorkerMessageCode.Response, response]));
      expect(adapter.call('readFile', ['/test.txt'])).toEqual(response);
    } finally {
      if (originalWorker) Object.defineProperty(globalThis, 'Worker', originalWorker);
      else delete (globalThis as any).Worker;
    }
  });
});
