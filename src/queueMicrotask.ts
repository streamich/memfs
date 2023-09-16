import setImmediate from './setImmediate';

type TQueueMicroTask = (callback: () => void) => void;

let promise: Promise<void>;

const _queueMicrotask: TQueueMicroTask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask.bind(typeof window !== 'undefined' ? window : global)
    : cb =>
        (promise ||= Promise.resolve()).then(cb).catch(err =>
          setImmediate(() => {
            throw err;
          }),
        );

export default _queueMicrotask;
