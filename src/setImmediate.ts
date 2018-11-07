type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

/* istanbul ignore next */
if (typeof setImmediate === 'function') _setImmediate = setImmediate.bind(global);
/* istanbul ignore next */ else _setImmediate = setTimeout.bind(global);

export default _setImmediate as TSetImmediate;
