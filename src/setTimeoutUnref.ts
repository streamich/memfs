export type TSetTimeout = (callback: (...args) => void, time?: number, args?: any[]) => any;

/**
 * `setTimeoutUnref` is just like `setTimeout`,
 * only in Node's environment it will "unref" its macro task.
 */
function setTimeoutUnref(callback, time?, args?): object {
  const ref = setTimeout.apply(null, arguments);
  if (ref && typeof ref === 'object' && typeof ref.unref === 'function') ref.unref();
  return ref;
}

export default setTimeoutUnref;
