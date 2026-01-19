export default typeof queueMicrotask === 'function' ? queueMicrotask : <typeof queueMicrotask>(cb =>
      Promise.resolve()
        .then(() => cb())
        .catch(() => {}));
